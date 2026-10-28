import { Either } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Beneficiada } from '@domain/fivo/entities/beneficiada';
import { Campanha, CampanhaStatus } from '@domain/fivo/entities/campanha';
import { CausaStatus } from '@domain/fivo/entities/causa';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { UserRole } from '@domain/fivo/entities/user';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCampanhaRepository } from '@test/repositories/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { BeneficiadaIndisponivelNaDecisaoError } from '../errors/beneficiada-indisponivel-na-decisao.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { AprovarCampanhaUseCase } from './aprovar-campanha';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';

function valor<T>(resultado: Either<Error, T>): T {
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

// Outra operação grava a campanha logo depois de cada leitura, então a versão
// guardada deixa de ser a que o caso de uso leu.
class RepositorioComGravacaoConcorrente extends InMemoryCampanhaRepository {
  override async findById(id: string): Promise<Campanha | null> {
    const lida = await super.findById(id);
    const concorrente = await super.findById(id);

    if (concorrente) {
      await this.salvar(concorrente, concorrente.versao);
    }

    return lida;
  }
}

describe('AprovarCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let sut: AprovarCampanhaUseCase;

  const admin = UserFactory.create({ role: UserRole.ADMIN });
  const agora = new Date('2026-10-21T15:00:00Z');

  afterEach(() => {
    jest.useRealTimers();
  });

  function criarSut(): AprovarCampanhaUseCase {
    return new AprovarCampanhaUseCase(
      campanhaRepository,
      registroAuditoriaRepository,
      new AssegurarBeneficiadaDisponivelUseCase(
        instituicaoRepository,
        causaRepository,
      ),
    );
  }

  beforeEach(() => {
    campanhaRepository = new InMemoryCampanhaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = criarSut();
  });

  // Campanha em análise que beneficia uma instituição aprovada do catálogo.
  async function criarEmAnalise(
    status: CampanhaStatus = CampanhaStatus.EM_ANALISE,
  ) {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);
    const campanha = CampanhaFactory.emAnalise({
      status,
      beneficiada: valor(
        Beneficiada.criar({ instituicaoId: instituicao.id.toString() }),
      ),
    });
    await campanhaRepository.create(campanha);
    return { campanha, instituicao };
  }

  async function salva(campanha: Campanha): Promise<Campanha> {
    return (await campanhaRepository.findById(campanha.id.toString()))!;
  }

  it('should approve a campaign under review, make it apt for a seal and audit the decision', async () => {
    const { campanha } = await criarEmAnalise();
    jest.useFakeTimers({ now: agora });

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isRight()).toBe(true);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.APROVADA);
    expect(depois.estaAptaASelo()).toBe(true);
    expect(depois.decididoPor?.equals(admin.id)).toBe(true);
    expect(depois.decididoEm).toEqual(agora);
    expect(depois.versao).toBe(campanha.versao + 1);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    const [registro] = registroAuditoriaRepository.items;
    expect(registro.tipo).toBe('CAMPANHA_APROVADA');
    expect(registro.usuarioId).toBe(admin.id.toString());
    expect(registro.entidadeId).toBe(campanha.id.toString());
    expect(registro.dados).toEqual({
      estadoAnterior: CampanhaStatus.EM_ANALISE,
      estadoNovo: CampanhaStatus.APROVADA,
    });
    expect(registro.criadoEm).toEqual(agora);
  });

  it('should reject with NotAllowedError (403) and change nothing when the user is not an admin', async () => {
    const { campanha } = await criarEmAnalise();
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(campanha.id.toString(), naoAdmin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(NotAllowedError);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(depois.versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });

  it('should reject with ResourceNotFoundError (404) when the campaign does not exist', async () => {
    const response = await sut.execute('non-existent-id', admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should reject with BeneficiadaIndisponivelNaDecisaoError (409) when the institution was suspended while the campaign waited', async () => {
    const { campanha, instituicao } = await criarEmAnalise();
    valor(instituicao.suspender(new UniqueEntityId()));
    await instituicaoRepository.save(instituicao);

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(
      BeneficiadaIndisponivelNaDecisaoError,
    );
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(depois.versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });

  it('should reject with BeneficiadaIndisponivelNaDecisaoError (409) when the cause was deactivated', async () => {
    const causa = CausaFactory.create({ status: CausaStatus.INATIVA });
    await causaRepository.create(causa);
    const campanha = CampanhaFactory.emAnalise({
      beneficiada: valor(Beneficiada.criar({ causaId: causa.id.toString() })),
    });
    await campanhaRepository.create(campanha);

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(
      BeneficiadaIndisponivelNaDecisaoError,
    );
    expect((await salva(campanha)).status).toBe(CampanhaStatus.EM_ANALISE);
  });

  it.each([
    CampanhaStatus.RASCUNHO,
    CampanhaStatus.APROVADA,
    CampanhaStatus.REJEITADA,
  ])(
    'should reject with TransicaoInvalidaError when the campaign is %s',
    async (status) => {
      const { campanha } = await criarEmAnalise(status);

      const response = await sut.execute(campanha.id.toString(), admin);

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
      const depois = await salva(campanha);
      expect(depois.status).toBe(status);
      expect(depois.versao).toBe(campanha.versao);
      expect(registroAuditoriaRepository.items).toHaveLength(0);
    },
  );

  it('should reject with TransicaoInvalidaError when another decision saved the campaign first', async () => {
    campanhaRepository = new RepositorioComGravacaoConcorrente();
    sut = criarSut();
    const { campanha } = await criarEmAnalise();

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    expect((await salva(campanha)).status).toBe(CampanhaStatus.EM_ANALISE);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });
});
