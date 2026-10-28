import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Beneficiada } from '@domain/fivo/catalogo';
import { CampanhaStatus } from '../entities/campanha';
import { DataCalendario } from '../entities/data-calendario';
import { DescricaoCampanha } from '../entities/descricao-campanha';
import { Empresa, EmpresaStatus } from '@domain/fivo/empresas';
import { RegraDoacao, TipoRegraDoacao } from '../entities/regra-doacao';
import { ValorMonetario } from '../entities/valor-monetario';
import { Vigencia } from '../entities/vigencia';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { ConsultarCampanhaDaEmpresaUseCase } from './consultar-campanha-da-empresa';

function data(texto: string): DataCalendario {
  const resultado = DataCalendario.criar(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function vigencia(inicio: string, fim?: string): Vigencia {
  const resultado = Vigencia.criar({
    inicio: data(inicio),
    fim: fim ? data(fim) : undefined,
  });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function beneficiada(props: {
  instituicaoId?: string;
  causaId?: string;
}): Beneficiada {
  const resultado = Beneficiada.criar(props);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function valorMonetario(texto: string): ValorMonetario {
  const resultado = ValorMonetario.deDecimal(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function regraPorUnidade(valor: string): RegraDoacao {
  const resultado = RegraDoacao.criar({
    tipo: TipoRegraDoacao.POR_UNIDADE,
    valor,
  });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function regraPercentual(percentual: string): RegraDoacao {
  const resultado = RegraDoacao.criar({
    tipo: TipoRegraDoacao.PERCENTUAL,
    percentual,
  });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function descricao(texto: string): DescricaoCampanha {
  const resultado = DescricaoCampanha.criar(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

describe('ConsultarCampanhaDaEmpresaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresa: Empresa;
  let sut: ConsultarCampanhaDaEmpresaUseCase;

  beforeEach(() => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    sut = new ConsultarCampanhaDaEmpresaUseCase(campanhaRepository);
  });

  it('returns every field to the owner, including the last rejection reason', async () => {
    const instituicaoId = new UniqueEntityId().toString();
    const capaArquivoId = new UniqueEntityId();
    const submetidaEm = new Date('2026-10-20T12:00:00Z');
    const createdAt = new Date('2026-10-19T09:00:00Z');
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      descricao: descricao('Cada produto vendido ajuda uma instituição.'),
      capaArquivoId,
      beneficiada: beneficiada({ instituicaoId }),
      regraDoacao: regraPorUnidade('1.50'),
      meta: valorMonetario('1000.00'),
      vigencia: vigencia('2026-11-01', '2026-12-31'),
      status: CampanhaStatus.RASCUNHO,
      submetidaEm,
      motivoUltimaRejeicao: 'A descrição não explica como a doação é feita.',
      createdAt,
    });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;

    expect(response.value).toEqual({
      id: campanha.id.toString(),
      idPublico: campanha.idPublico.toString(),
      nome: 'Campanha Teste',
      descricao: 'Cada produto vendido ajuda uma instituição.',
      capaArquivoId: capaArquivoId.toString(),
      beneficiada: { tipo: 'INSTITUICAO', id: instituicaoId },
      regraDoacao: {
        tipo: TipoRegraDoacao.POR_UNIDADE,
        valor: '1.50',
        percentual: undefined,
      },
      meta: '1000.00',
      vigencia: { inicio: '2026-11-01', fim: '2026-12-31' },
      status: CampanhaStatus.RASCUNHO,
      submetidaEm,
      motivoUltimaRejeicao: 'A descrição não explica como a doação é feita.',
      alteracaoPendente: null,
      criadaEm: createdAt,
      atualizadaEm: null,
    });
  });

  it('converts 150 centavos to "1.50" and a percentual to its decimal text', async () => {
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      regraDoacao: regraPercentual('12.5'),
      meta: valorMonetario('1.5'),
    });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value.meta).toBe('1.50');
    expect(response.value.regraDoacao).toEqual({
      tipo: TipoRegraDoacao.PERCENTUAL,
      valor: undefined,
      percentual: '12.50',
    });
  });

  it('keeps the leading zero of the fraction in valor and meta', async () => {
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      regraDoacao: regraPorUnidade('0.05'),
      meta: valorMonetario('1.05'),
    });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value.regraDoacao).toEqual({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      valor: '0.05',
    });
    expect(response.value.meta).toBe('1.05');
  });

  it('keeps the leading zero of the fraction in percentual', async () => {
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      regraDoacao: regraPercentual('0.01'),
    });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value.regraDoacao).toEqual({
      tipo: TipoRegraDoacao.PERCENTUAL,
      percentual: '0.01',
    });
  });

  it('returns null for the fields a rascunho has not filled yet', async () => {
    const campanha = CampanhaFactory.create({ empresaId: empresa.id });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value).toMatchObject({
      status: CampanhaStatus.RASCUNHO,
      descricao: null,
      capaArquivoId: null,
      beneficiada: null,
      regraDoacao: null,
      meta: null,
      vigencia: null,
      submetidaEm: null,
      motivoUltimaRejeicao: null,
      alteracaoPendente: null,
    });
  });

  it('returns the pending alteração with the proposed values, keeping the approved ones in the main fields', async () => {
    const causaId = new UniqueEntityId().toString();
    const abertaEm = new Date('2026-10-22T10:00:00Z');
    const campanha = CampanhaFactory.aprovadaComAlteracao(
      {
        empresaId: empresa.id,
        beneficiada: beneficiada({ causaId }),
        regraDoacao: regraPorUnidade('1.50'),
        vigencia: vigencia('2026-10-01'),
      },
      { createdAt: abertaEm },
    );
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;

    expect(response.value.status).toBe(CampanhaStatus.APROVADA);
    expect(response.value.regraDoacao).toEqual({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      valor: '1.50',
      percentual: undefined,
    });
    // A alteração padrão da factory troca a regra para 10% do valor.
    expect(response.value.alteracaoPendente).toEqual({
      beneficiada: { tipo: 'CAUSA', id: causaId },
      regraDoacao: {
        tipo: TipoRegraDoacao.PERCENTUAL,
        valor: undefined,
        percentual: '10.00',
      },
      vigencia: { inicio: '2026-10-01', fim: undefined },
      abertaEm,
    });
  });

  it('lets a suspended empresa read its own campanha', async () => {
    const suspensa = EmpresaFactory.create({ status: EmpresaStatus.SUSPENSA });
    const campanha = CampanhaFactory.aprovada({ empresaId: suspensa.id });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      empresaId: suspensa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value.id).toBe(campanha.id.toString());
  });

  describe('não encontrada', () => {
    const naoEncontrada = new ResourceNotFoundError('Campanha não encontrada');

    it('returns ResourceNotFoundError when the campanha belongs to another empresa', async () => {
      const outraEmpresa = EmpresaFactory.create();
      const campanha = CampanhaFactory.completa({
        empresaId: outraEmpresa.id,
      });
      await campanhaRepository.create(campanha);

      const response = await sut.execute({
        empresaId: empresa.id.toString(),
        campanhaId: campanha.id.toString(),
      });

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
      expect(response.value).toEqual(naoEncontrada);
    });

    it('returns the same error when the campanha does not exist', async () => {
      const response = await sut.execute({
        empresaId: empresa.id.toString(),
        campanhaId: new UniqueEntityId().toString(),
      });

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
      expect(response.value).toEqual(naoEncontrada);
    });
  });
});
