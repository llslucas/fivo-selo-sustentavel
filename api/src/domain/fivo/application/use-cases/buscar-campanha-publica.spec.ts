import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Beneficiada } from '@domain/fivo/entities/beneficiada';
import { CampanhaStatus } from '@domain/fivo/entities/campanha';
import { CausaStatus } from '@domain/fivo/entities/causa';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { ValorMonetario } from '@domain/fivo/entities/valor-monetario';
import { Vigencia } from '@domain/fivo/entities/vigencia';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCampanhaRepository } from '@test/repositories/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { BuscarCampanhaPublicaUseCase } from './buscar-campanha-publica';

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

function regraDoacao(valor: string): RegraDoacao {
  const resultado = RegraDoacao.criar({
    tipo: TipoRegraDoacao.POR_UNIDADE,
    valor,
  });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

describe('BuscarCampanhaPublicaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let empresa: Empresa;
  let instituicao: Instituicao;
  let sut: BuscarCampanhaPublicaUseCase;

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

    sut = new BuscarCampanhaPublicaUseCase(
      campanhaRepository,
      empresaRepository,
      instituicaoRepository,
      causaRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function aprovada(props = {}) {
    const campanha = CampanhaFactory.aprovada({
      empresaId: empresa.id,
      beneficiada: beneficiada({ instituicaoId: instituicao.id.toString() }),
      regraDoacao: regraDoacao('1.50'),
      meta: valorMonetario('1000.00'),
      vigencia: vigencia('2026-10-01'),
      ...props,
    });
    await campanhaRepository.create(campanha);
    return campanha;
  }

  it('returns the full read model for an APROVADA campanha of an APROVADA empresa', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-21T15:00:00Z') });
    const campanha = await aprovada({ capaArquivoId: new UniqueEntityId() });

    const response = await sut.execute({
      idPublico: campanha.idPublico.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;

    expect(response.value).toEqual({
      nome: campanha.nome.valor,
      descricao: campanha.descricao?.valor ?? null,
      temCapa: true,
      empresa: empresa.nomeFantasia,
      beneficiada: {
        tipo: 'INSTITUICAO',
        nome: instituicao.nomeFantasia,
      },
      regraDoacao: {
        tipo: TipoRegraDoacao.POR_UNIDADE,
        valor: '1.50',
        percentual: undefined,
      },
      meta: '1000.00',
      vigencia: { inicio: '2026-10-01', fim: undefined },
      situacao: 'EM_ANDAMENTO',
    });
  });

  it('resolves a CAUSA beneficiada by its nome', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-21T15:00:00Z') });
    const causa = CausaFactory.create({
      nome: 'Educação para Todos',
      status: CausaStatus.ATIVA,
    });
    await causaRepository.create(causa);
    const campanha = await aprovada({
      beneficiada: beneficiada({ causaId: causa.id.toString() }),
    });

    const response = await sut.execute({
      idPublico: campanha.idPublico.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value.beneficiada).toEqual({
      tipo: 'CAUSA',
      nome: 'Educação para Todos',
    });
  });

  it('reports NAO_INICIADA when the campanha starts tomorrow', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-21T15:00:00Z') });
    const campanha = await aprovada({ vigencia: vigencia('2026-10-22') });

    const response = await sut.execute({
      idPublico: campanha.idPublico.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value.situacao).toBe('NAO_INICIADA');
  });

  it('reports EM_ANDAMENTO when the campanha starts today', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-21T15:00:00Z') });
    const campanha = await aprovada({ vigencia: vigencia('2026-10-21') });

    const response = await sut.execute({
      idPublico: campanha.idPublico.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    expect(response.value.situacao).toBe('EM_ANDAMENTO');
  });

  it('returns the approved values, not the pending ones, when there is an alteração em análise', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-21T15:00:00Z') });
    const campanha = CampanhaFactory.aprovadaComAlteracao({
      empresaId: empresa.id,
      beneficiada: beneficiada({ instituicaoId: instituicao.id.toString() }),
      regraDoacao: regraDoacao('1.50'),
      vigencia: vigencia('2026-10-01'),
    });
    await campanhaRepository.create(campanha);

    const response = await sut.execute({
      idPublico: campanha.idPublico.toString(),
    });

    expect(response.isRight()).toBe(true);
    if (response.isLeft()) throw response.value;
    // A alteração padrão troca a regra para PERCENTUAL; a consulta pública
    // deve ignorar o proposto e devolver o valor aprovado.
    expect(response.value.regraDoacao).toEqual({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      valor: '1.50',
      percentual: undefined,
    });
  });

  describe('não encontrada', () => {
    const naoEncontrada = new ResourceNotFoundError('Campanha não encontrada');

    const casos: [string, () => Promise<string>][] = [
      ['idPublico is not a valid UUID', () => Promise.resolve('nao-e-um-uuid')],
      [
        'the campanha does not exist',
        () => Promise.resolve(new UniqueEntityId().toString()),
      ],
      [
        'the campanha is a RASCUNHO',
        async () => {
          const campanha = CampanhaFactory.create({ empresaId: empresa.id });
          await campanhaRepository.create(campanha);
          return campanha.idPublico.toString();
        },
      ],
      [
        'the campanha is EM_ANALISE',
        async () => {
          const campanha = CampanhaFactory.emAnalise({ empresaId: empresa.id });
          await campanhaRepository.create(campanha);
          return campanha.idPublico.toString();
        },
      ],
      [
        'the campanha is REJEITADA',
        async () => {
          const campanha = CampanhaFactory.completa({
            empresaId: empresa.id,
            status: CampanhaStatus.REJEITADA,
          });
          await campanhaRepository.create(campanha);
          return campanha.idPublico.toString();
        },
      ],
      [
        'the owning empresa is not APROVADA (suspensa)',
        async () => {
          const suspensa = EmpresaFactory.create({
            status: EmpresaStatus.SUSPENSA,
          });
          await empresaRepository.create(suspensa);
          const campanha = await aprovada({ empresaId: suspensa.id });
          return campanha.idPublico.toString();
        },
      ],
    ];

    it.each(casos)(
      'returns the same error when %s',
      async (_descricao, preparar) => {
        const idPublico = await preparar();

        const response = await sut.execute({ idPublico });

        expect(response.isLeft()).toBe(true);
        expect(response.value).toBeInstanceOf(ResourceNotFoundError);
        expect(response.value).toEqual(naoEncontrada);
        expect((response.value as ResourceNotFoundError).message).toBe(
          naoEncontrada.message,
        );
      },
    );
  });
});
