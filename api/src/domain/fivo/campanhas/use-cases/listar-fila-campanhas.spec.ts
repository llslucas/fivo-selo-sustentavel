import { Either } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { Beneficiada, Causa, Instituicao } from '@domain/fivo/catalogo';
import { CampanhaStatus } from '../entities/campanha';
import { Compromisso } from '../entities/compromisso';
import { DataCalendario } from '../entities/data-calendario';
import { Empresa } from '@domain/fivo/empresas';
import { NomeCampanha } from '../entities/nome-campanha';
import { RegraDoacao, TipoRegraDoacao } from '../entities/regra-doacao';
import { UserRole } from '@domain/fivo/identidade';
import { Vigencia } from '../entities/vigencia';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/doubles/in-memory-causa-repository';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { InMemoryInstituicaoRepository } from '@test/doubles/in-memory-instituicao-repository';
import { ListarFilaCampanhasUseCase } from './listar-fila-campanhas';

function valor<T>(resultado: Either<Error, T>): T {
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function vigencia(inicio: string, fim?: string): Vigencia {
  return valor(
    Vigencia.criar({
      inicio: valor(DataCalendario.criar(inicio)),
      fim: fim ? valor(DataCalendario.criar(fim)) : undefined,
    }),
  );
}

describe('ListarFilaCampanhasUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let empresa: Empresa;
  let instituicao: Instituicao;
  let causa: Causa;
  let sut: ListarFilaCampanhasUseCase;

  const admin = UserFactory.create({ role: UserRole.ADMIN });

  beforeEach(async () => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();

    empresa = EmpresaFactory.create({ nomeFantasia: 'Padaria Boa' });
    await empresaRepository.create(empresa);

    instituicao = InstituicaoFactory.create({ nomeFantasia: 'Lar Esperanca' });
    await instituicaoRepository.create(instituicao);

    causa = CausaFactory.create({ nome: 'Meio Ambiente' });
    await causaRepository.create(causa);

    sut = new ListarFilaCampanhasUseCase(
      campanhaRepository,
      empresaRepository,
      instituicaoRepository,
      causaRepository,
    );
  });

  function compromissoComInstituicao(): Partial<{
    beneficiada: Beneficiada;
    regraDoacao: RegraDoacao;
    vigencia: Vigencia;
  }> {
    return {
      beneficiada: valor(
        Beneficiada.criar({ instituicaoId: instituicao.id.toString() }),
      ),
      regraDoacao: valor(
        RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE, valor: '1.5' }),
      ),
      vigencia: vigencia('2026-11-01', '2026-12-31'),
    };
  }

  function propostoComCausa(): Compromisso {
    return Compromisso.criar({
      beneficiada: valor(Beneficiada.criar({ causaId: causa.id.toString() })),
      regraDoacao: valor(
        RegraDoacao.criar({
          tipo: TipoRegraDoacao.PERCENTUAL,
          percentual: '12.5',
        }),
      ),
      vigencia: vigencia('2027-01-01'),
    });
  }

  it.each([UserRole.EMPRESA, UserRole.INSTITUICAO])(
    'rejects with NotAllowedError for a %s user',
    async (role) => {
      const response = await sut.execute({
        user: UserFactory.create({ role }),
      });

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(NotAllowedError);
    },
  );

  it('lists a campanha EM_ANALISE as NOVA with empresa, beneficiada, regra, vigência and submission time', async () => {
    const submetidaEm = new Date('2026-10-20T13:00:00Z');
    const campanha = CampanhaFactory.emAnalise({
      empresaId: empresa.id,
      nome: valor(NomeCampanha.criar('Natal Solidario')),
      submetidaEm,
      ...compromissoComInstituicao(),
    });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({ user: admin });

    expect(response.isRight()).toBe(true);
    expect(response.value).toEqual([
      {
        campanhaId: campanha.id.toString(),
        tipo: 'NOVA',
        empresa: 'Padaria Boa',
        nome: 'Natal Solidario',
        beneficiada: { tipo: 'INSTITUICAO', nome: 'Lar Esperanca' },
        regraDoacao: {
          tipo: TipoRegraDoacao.POR_UNIDADE,
          valor: '1.50',
          percentual: undefined,
        },
        vigencia: { inicio: '2026-11-01', fim: '2026-12-31' },
        submetidoEm: submetidaEm,
      },
    ]);
  });

  it('lists a pending alteração as ALTERACAO with the proposed values and the time it was opened', async () => {
    const abertaEm = new Date('2026-10-22T09:30:00Z');
    const campanha = CampanhaFactory.aprovadaComAlteracao(
      {
        empresaId: empresa.id,
        nome: valor(NomeCampanha.criar('Natal Solidario')),
        submetidaEm: new Date('2026-10-01T10:00:00Z'),
        ...compromissoComInstituicao(),
      },
      { proposto: propostoComCausa(), createdAt: abertaEm },
    );
    await campanhaRepository.create(campanha);

    const response = await sut.execute({ user: admin });

    expect(response.isRight()).toBe(true);
    expect(response.value).toEqual([
      {
        campanhaId: campanha.id.toString(),
        tipo: 'ALTERACAO',
        empresa: 'Padaria Boa',
        nome: 'Natal Solidario',
        beneficiada: { tipo: 'CAUSA', nome: 'Meio Ambiente' },
        regraDoacao: {
          tipo: TipoRegraDoacao.PERCENTUAL,
          valor: undefined,
          percentual: '12.50',
        },
        vigencia: { inicio: '2027-01-01', fim: undefined },
        submetidoEm: abertaEm,
      },
    ]);
  });

  it('orders NOVA and ALTERACAO items together from the oldest to the newest', async () => {
    const maisNova = CampanhaFactory.emAnalise({
      empresaId: empresa.id,
      nome: valor(NomeCampanha.criar('Terceira')),
      submetidaEm: new Date('2026-10-03T10:00:00Z'),
    });
    const alteracaoNoMeio = CampanhaFactory.aprovadaComAlteracao(
      {
        empresaId: empresa.id,
        nome: valor(NomeCampanha.criar('Segunda')),
        submetidaEm: new Date('2026-09-01T10:00:00Z'),
      },
      { createdAt: new Date('2026-10-02T10:00:00Z') },
    );
    const maisAntiga = CampanhaFactory.emAnalise({
      empresaId: empresa.id,
      nome: valor(NomeCampanha.criar('Primeira')),
      submetidaEm: new Date('2026-10-01T10:00:00Z'),
    });
    await campanhaRepository.create(maisNova);
    await campanhaRepository.create(alteracaoNoMeio);
    await campanhaRepository.create(maisAntiga);

    const response = await sut.execute({ user: admin });

    expect(response.isRight()).toBe(true);
    if (response.isRight()) {
      expect(response.value.map(({ nome, tipo }) => ({ nome, tipo }))).toEqual([
        { nome: 'Primeira', tipo: 'NOVA' },
        { nome: 'Segunda', tipo: 'ALTERACAO' },
        { nome: 'Terceira', tipo: 'NOVA' },
      ]);
    }
  });

  it('leaves out RASCUNHO, REJEITADA and APROVADA campanhas without a pending alteração', async () => {
    await campanhaRepository.create(
      CampanhaFactory.completa({ empresaId: empresa.id }),
    );
    await campanhaRepository.create(
      CampanhaFactory.completa({
        empresaId: empresa.id,
        status: CampanhaStatus.REJEITADA,
      }),
    );
    await campanhaRepository.create(
      CampanhaFactory.aprovada({ empresaId: empresa.id }),
    );

    const response = await sut.execute({ user: admin });

    expect(response.isRight()).toBe(true);
    expect(response.value).toEqual([]);
  });
});
