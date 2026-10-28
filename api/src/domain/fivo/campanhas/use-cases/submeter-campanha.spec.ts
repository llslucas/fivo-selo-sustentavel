import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import {
  Beneficiada,
  CausaStatus,
  Instituicao,
  InstituicaoStatus,
  BeneficiadaIndisponivelError,
  AssegurarBeneficiadaDisponivelUseCase,
} from '@domain/fivo/catalogo';
import { CampanhaStatus } from '../entities/campanha';
import { DataCalendario } from '../entities/data-calendario';
import {
  Empresa,
  EmpresaStatus,
  AssegurarEmpresaAprovadaUseCase,
} from '@domain/fivo/empresas';
import { Vigencia } from '../entities/vigencia';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/doubles/in-memory-causa-repository';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { InMemoryInstituicaoRepository } from '@test/doubles/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/doubles/in-memory-registro-auditoria-repository';
import { CamposPendentesError } from '../errors/campos-pendentes.error';
import { TransicaoInvalidaError } from '@domain/fivo/shared';
import { VigenciaVencidaError } from '../errors/vigencia-vencida.error';
import { SubmeterCampanhaUseCase } from './submeter-campanha';

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

describe('SubmeterCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let empresa: Empresa;
  let instituicao: Instituicao;
  let sut: SubmeterCampanhaUseCase;

  const usuarioId = new UniqueEntityId().toString();

  beforeEach(async () => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();

    empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(empresa);

    instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);

    sut = new SubmeterCampanhaUseCase(
      campanhaRepository,
      registroAuditoriaRepository,
      new AssegurarEmpresaAprovadaUseCase(empresaRepository),
      new AssegurarBeneficiadaDisponivelUseCase(
        instituicaoRepository,
        causaRepository,
      ),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function rascunhoCompleto(fim?: string) {
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      beneficiada: beneficiada({ instituicaoId: instituicao.id.toString() }),
      vigencia: vigencia('2026-10-01', fim),
    });
    await campanhaRepository.create(campanha);
    return campanha;
  }

  function submeter(campanhaId: string, empresaId = empresa.id.toString()) {
    return sut.execute({ empresaId, usuarioId, campanhaId });
  }

  function expectNadaGravado() {
    expect(campanhaRepository.items[0].status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanhaRepository.items[0].submetidaEm).toBeUndefined();
    expect(campanhaRepository.items[0].versao).toBe(0);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  }

  it('moves a complete RASCUNHO to EM_ANALISE, records the submission time and audits it', async () => {
    const agora = new Date('2026-10-21T15:00:00Z');
    jest.useFakeTimers({ now: agora });
    const campanha = await rascunhoCompleto();

    const response = await submeter(campanha.id.toString());

    expect(response.isRight()).toBe(true);

    const salva = campanhaRepository.items[0];
    expect(salva.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(salva.submetidaEm).toEqual(agora);
    expect(salva.versao).toBe(1);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0]).toEqual(
      expect.objectContaining({
        tipo: 'CAMPANHA_SUBMETIDA',
        usuarioId,
        entidadeId: campanha.id.toString(),
        dados: {
          estadoAnterior: CampanhaStatus.RASCUNHO,
          estadoNovo: CampanhaStatus.EM_ANALISE,
        },
        criadoEm: agora,
      }),
    );
  });

  it('submits a campanha whose beneficiada is an ATIVA causa', async () => {
    const causa = CausaFactory.create({ status: CausaStatus.ATIVA });
    await causaRepository.create(causa);
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      beneficiada: beneficiada({ causaId: causa.id.toString() }),
    });
    await campanhaRepository.create(campanha);

    const response = await submeter(campanha.id.toString());

    expect(response.isRight()).toBe(true);
    expect(campanhaRepository.items[0].status).toBe(CampanhaStatus.EM_ANALISE);
  });

  it('rejects with NotAllowedError "Cadastro ainda não aprovado" when the empresa is not APROVADA', async () => {
    const pendente = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });
    await empresaRepository.create(pendente);
    const campanha = CampanhaFactory.completa({
      empresaId: pendente.id,
      beneficiada: beneficiada({ instituicaoId: instituicao.id.toString() }),
    });
    await campanhaRepository.create(campanha);

    const response = await submeter(
      campanha.id.toString(),
      pendente.id.toString(),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(NotAllowedError);
    expect((response.value as NotAllowedError).message).toBe(
      'Cadastro ainda não aprovado',
    );
    expectNadaGravado();
  });

  it('rejects with ResourceNotFoundError when the campanha belongs to another empresa', async () => {
    const outra = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(outra);
    const campanha = await rascunhoCompleto();

    const response = await submeter(
      campanha.id.toString(),
      outra.id.toString(),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    expectNadaGravado();
  });

  it('rejects with ResourceNotFoundError when the campanha does not exist', async () => {
    const response = await submeter(new UniqueEntityId().toString());

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });

  it('rejects with CamposPendentesError listing every missing field at once', async () => {
    const campanha = CampanhaFactory.create({ empresaId: empresa.id });
    await campanhaRepository.create(campanha);

    const response = await submeter(campanha.id.toString());

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(CamposPendentesError);
    expect((response.value as CamposPendentesError).status).toBe(422);
    expect((response.value as CamposPendentesError).message).toBe(
      'Preencha os campos obrigatórios antes de enviar para análise',
    );
    expect((response.value as CamposPendentesError).campos).toEqual([
      'descricao',
      'beneficiada',
      'regraDoacao',
      'vigencia.inicio',
    ]);
    expectNadaGravado();
  });

  it('rejects with VigenciaVencidaError when the end date is today in São Paulo', async () => {
    // 23:00 de 31/12 em São Paulo; no UTC já é 01/01.
    jest.useFakeTimers({ now: new Date('2027-01-01T02:00:00Z') });
    const campanha = await rascunhoCompleto('2026-12-31');

    const response = await submeter(campanha.id.toString());

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(VigenciaVencidaError);
    expectNadaGravado();
  });

  it('accepts an end date after today in São Paulo even when the UTC date already reached it', async () => {
    jest.useFakeTimers({ now: new Date('2027-01-01T02:00:00Z') });
    const campanha = await rascunhoCompleto('2027-01-01');

    const response = await submeter(campanha.id.toString());

    expect(response.isRight()).toBe(true);
    expect(campanhaRepository.items[0].status).toBe(CampanhaStatus.EM_ANALISE);
  });

  it('rejects with BeneficiadaIndisponivelError when the instituicao is no longer APROVADA', async () => {
    const suspensa = InstituicaoFactory.create({
      status: InstituicaoStatus.SUSPENSA,
    });
    await instituicaoRepository.create(suspensa);
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      beneficiada: beneficiada({ instituicaoId: suspensa.id.toString() }),
    });
    await campanhaRepository.create(campanha);

    const response = await submeter(campanha.id.toString());

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
    expectNadaGravado();
  });

  it('rejects with BeneficiadaIndisponivelError when the causa is INATIVA', async () => {
    const causa = CausaFactory.create({ status: CausaStatus.INATIVA });
    await causaRepository.create(causa);
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      beneficiada: beneficiada({ causaId: causa.id.toString() }),
    });
    await campanhaRepository.create(campanha);

    const response = await submeter(campanha.id.toString());

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
    expectNadaGravado();
  });

  it('rejects a second submission with TransicaoInvalidaError and records only one', async () => {
    const campanha = await rascunhoCompleto();
    await submeter(campanha.id.toString());

    const response = await submeter(campanha.id.toString());

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(campanhaRepository.items[0].versao).toBe(1);
    expect(registroAuditoriaRepository.items).toHaveLength(1);
  });

  it('rejects with TransicaoInvalidaError and leaves no audit when salvar is not applied', async () => {
    const campanha = await rascunhoCompleto();
    jest.spyOn(campanhaRepository, 'salvar').mockResolvedValueOnce(false);

    const response = await submeter(campanha.id.toString());

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    expectNadaGravado();
  });
});
