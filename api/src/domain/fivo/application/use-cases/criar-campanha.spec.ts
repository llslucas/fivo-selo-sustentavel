import { NotAllowedError } from '@core/errors/not-allowed-error';
import { CausaStatus } from '@domain/fivo/entities/causa';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { TipoRegraDoacao } from '@domain/fivo/entities/regra-doacao';
import { CausaFactory } from '@test/factories/causa-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCampanhaRepository } from '@test/repositories/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { BeneficiadaIndisponivelError } from '../errors/beneficiada-indisponivel.error';
import { DataInvalidaError } from '../errors/data-invalida.error';
import { DescricaoCampanhaInvalidaError } from '../errors/descricao-campanha-invalida.error';
import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';
import { NomeCampanhaInvalidoError } from '../errors/nome-campanha-invalido.error';
import { PercentualInvalidoError } from '../errors/percentual-invalido.error';
import { ValorMonetarioInvalidoError } from '../errors/valor-monetario-invalido.error';
import { VigenciaInvalidaError } from '../errors/vigencia-invalida.error';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';
import { AssegurarEmpresaAprovadaUseCase } from './assegurar-empresa-aprovada';
import {
  CriarCampanhaUseCase,
  CriarCampanhaUseCaseRequest,
} from './criar-campanha';

describe('CriarCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let empresa: Empresa;
  let instituicao: Instituicao;
  let sut: CriarCampanhaUseCase;

  beforeEach(async () => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();

    empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(empresa);

    instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);

    sut = new CriarCampanhaUseCase(
      campanhaRepository,
      new AssegurarEmpresaAprovadaUseCase(empresaRepository),
      new AssegurarBeneficiadaDisponivelUseCase(
        instituicaoRepository,
        causaRepository,
      ),
    );
  });

  function pedido(
    overrides: Partial<CriarCampanhaUseCaseRequest> = {},
  ): CriarCampanhaUseCaseRequest {
    return {
      empresaId: empresa.id.toString(),
      nome: 'Campanha Teste',
      ...overrides,
    };
  }

  function expectNadaGravado() {
    expect(campanhaRepository.items).toHaveLength(0);
  }

  it('creates a RASCUNHO with only the name and returns id and idPublico', async () => {
    const response = await sut.execute(pedido());

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;

    const { id, idPublico } = response.value;
    expect(id).toEqual(expect.any(String));
    expect(idPublico).toEqual(expect.any(String));
    expect(idPublico).not.toBe(id);

    expect(campanhaRepository.items).toHaveLength(1);
    const salva = campanhaRepository.items[0];
    expect(salva.id.toString()).toBe(id);
    expect(salva.idPublico.toString()).toBe(idPublico);
    expect(salva.nome.valor).toBe('Campanha Teste');
  });

  it('creates a complete RASCUNHO applying every optional field', async () => {
    const response = await sut.execute(
      pedido({
        descricao: 'Cada produto vendido ajuda uma instituicao.',
        instituicaoId: instituicao.id.toString(),
        regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '1.50' },
        meta: '1000',
        vigencia: { inicio: '2026-11-01', fim: '2026-11-30' },
      }),
    );

    expect(response.isRight()).toBe(true);
    const salva = campanhaRepository.items[0];
    expect(salva.descricao?.valor).toBe(
      'Cada produto vendido ajuda uma instituicao.',
    );
    expect(salva.beneficiada?.tipo).toBe('INSTITUICAO');
    expect(salva.beneficiada?.id).toBe(instituicao.id.toString());
    expect(salva.regraDoacao?.valor?.centavos).toBe(150);
    expect(salva.meta?.centavos).toBe(100000);
    expect(salva.vigencia?.inicio.valor).toBe('2026-11-01');
    expect(salva.vigencia?.fim?.valor).toBe('2026-11-30');
  });

  it('rejects with NotAllowedError "Cadastro ainda não aprovado" when the empresa is not APROVADA and saves nothing', async () => {
    const pendente = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });
    await empresaRepository.create(pendente);

    const response = await sut.execute(
      pedido({ empresaId: pendente.id.toString() }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(NotAllowedError);
    expect((response.value as NotAllowedError).message).toBe(
      'Cadastro ainda não aprovado',
    );
    expectNadaGravado();
  });

  it('returns NomeCampanhaInvalidoError and saves nothing for an invalid nome', async () => {
    const response = await sut.execute(pedido({ nome: 'ab' }));

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(NomeCampanhaInvalidoError);
    expectNadaGravado();
  });

  it('returns DescricaoCampanhaInvalidaError and saves nothing for an invalid descricao', async () => {
    const response = await sut.execute(pedido({ descricao: 'a'.repeat(2001) }));

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(DescricaoCampanhaInvalidaError);
    expectNadaGravado();
  });

  it('returns ValorMonetarioInvalidoError and saves nothing for an invalid meta', async () => {
    const response = await sut.execute(pedido({ meta: '0' }));

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(ValorMonetarioInvalidoError);
    expectNadaGravado();
  });

  it('returns InvalidRuleValueError and saves nothing for an invalid regra de doação', async () => {
    const response = await sut.execute(
      pedido({
        regraDoacao: {
          tipo: TipoRegraDoacao.POR_UNIDADE,
          valor: '1.00',
          percentual: '10', // indevido para POR_UNIDADE
        },
      }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(InvalidRuleValueError);
    expectNadaGravado();
  });

  it('returns PercentualInvalidoError and saves nothing for an invalid percentual', async () => {
    const response = await sut.execute(
      pedido({
        regraDoacao: { tipo: TipoRegraDoacao.PERCENTUAL, percentual: '0' },
      }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(PercentualInvalidoError);
    expectNadaGravado();
  });

  it('returns DataInvalidaError and saves nothing for an invalid vigência date', async () => {
    const response = await sut.execute(
      pedido({ vigencia: { inicio: '2026-02-30' } }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(DataInvalidaError);
    expectNadaGravado();
  });

  it('returns VigenciaInvalidaError and saves nothing when fim is not after inicio', async () => {
    const response = await sut.execute(
      pedido({ vigencia: { inicio: '2026-11-01', fim: '2026-11-01' } }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(VigenciaInvalidaError);
    expectNadaGravado();
  });

  it('returns VigenciaInvalidaError and saves nothing when fim is one day before inicio', async () => {
    const response = await sut.execute(
      pedido({ vigencia: { inicio: '2026-11-01', fim: '2026-10-31' } }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(VigenciaInvalidaError);
    expect((response.value as VigenciaInvalidaError).message).toBe(
      'A data de fim deve ser posterior à data de início',
    );
    expectNadaGravado();
  });

  it('returns BeneficiadaIndisponivelError and saves nothing when the instituicao is SUSPENSA', async () => {
    const suspensa = InstituicaoFactory.create({
      status: InstituicaoStatus.SUSPENSA,
    });
    await instituicaoRepository.create(suspensa);

    const response = await sut.execute(
      pedido({ instituicaoId: suspensa.id.toString() }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
    expectNadaGravado();
  });

  it('returns BeneficiadaIndisponivelError and saves nothing when the causa is INATIVA', async () => {
    const causa = CausaFactory.create({ status: CausaStatus.INATIVA });
    await causaRepository.create(causa);

    const response = await sut.execute(
      pedido({ causaId: causa.id.toString() }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
    expectNadaGravado();
  });

  it('creates a RASCUNHO whose beneficiada is an ATIVA causa', async () => {
    const causa = CausaFactory.create({ status: CausaStatus.ATIVA });
    await causaRepository.create(causa);

    const response = await sut.execute(
      pedido({ causaId: causa.id.toString() }),
    );

    expect(response.isRight()).toBe(true);
    const salva = campanhaRepository.items[0];
    expect(salva.beneficiada?.tipo).toBe('CAUSA');
    expect(salva.beneficiada?.id).toBe(causa.id.toString());
  });

  it('returns BeneficiadaAmbiguaError and saves nothing when both instituicao and causa are informed', async () => {
    const causa = CausaFactory.create({ status: CausaStatus.ATIVA });
    await causaRepository.create(causa);

    const response = await sut.execute(
      pedido({
        instituicaoId: instituicao.id.toString(),
        causaId: causa.id.toString(),
      }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaAmbiguaError);
    expectNadaGravado();
  });

  it('does not touch the beneficiada guard when no beneficiada is informed', async () => {
    const spy = jest.spyOn(
      AssegurarBeneficiadaDisponivelUseCase.prototype,
      'execute',
    );

    const response = await sut.execute(pedido());

    expect(response.isRight()).toBe(true);
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
