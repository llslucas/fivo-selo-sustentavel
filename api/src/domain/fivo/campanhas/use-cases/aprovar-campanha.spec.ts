import { Either } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import {
  Beneficiada,
  CausaStatus,
  InstituicaoStatus,
  AssegurarBeneficiadaDisponivelUseCase,
} from '@domain/fivo/catalogo';
import { Campanha, CampanhaStatus } from '../entities/campanha';
import { UserRole } from '@domain/fivo/identidade';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/doubles/in-memory-causa-repository';
import { InMemoryInstituicaoRepository } from '@test/doubles/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/doubles/in-memory-registro-auditoria-repository';
import { BeneficiadaIndisponivelNaDecisaoError } from '../errors/beneficiada-indisponivel-na-decisao.error';
import {
  Slug,
  SlugEmUsoError,
  TransicaoInvalidaError,
} from '@domain/fivo/shared';
import { NomeCampanha } from '../entities/nome-campanha';
import { AprovarCampanhaUseCase } from './aprovar-campanha';

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

  describe('slug (VIT-01)', () => {
    const empresaId = new UniqueEntityId();

    async function criarHomonima(
      props: Parameters<typeof CampanhaFactory.emAnalise>[0] = {},
    ): Promise<Campanha> {
      const instituicao = InstituicaoFactory.create({
        status: InstituicaoStatus.APROVADA,
      });
      await instituicaoRepository.create(instituicao);
      const campanha = CampanhaFactory.emAnalise({
        empresaId,
        nome: valor(NomeCampanha.criar('Verão Solidário')),
        beneficiada: valor(
          Beneficiada.criar({ instituicaoId: instituicao.id.toString() }),
        ),
        ...props,
      });
      await campanhaRepository.create(campanha);
      return campanha;
    }

    it('should assign the slug derived from the name on approval', async () => {
      const campanha = await criarHomonima();

      const response = await sut.execute(campanha.id.toString(), admin);

      expect(response.isRight()).toBe(true);
      expect((await salva(campanha)).slug?.valor).toBe('verao-solidario');
    });

    it('should fall back to "campanha" when the name has no valid character', async () => {
      const campanha = await criarHomonima({
        nome: valor(NomeCampanha.criar('!!!')),
      });

      const response = await sut.execute(campanha.id.toString(), admin);

      expect(response.isRight()).toBe(true);
      expect((await salva(campanha)).slug?.valor).toBe('campanha');
    });

    it('should give a same-name campaign of the same empresa the -2 suffix and keep the first one', async () => {
      const primeira = await criarHomonima();
      const segunda = await criarHomonima();

      await sut.execute(primeira.id.toString(), admin);
      const response = await sut.execute(segunda.id.toString(), admin);

      expect(response.isRight()).toBe(true);
      expect((await salva(primeira)).slug?.valor).toBe('verao-solidario');
      expect((await salva(segunda)).slug?.valor).toBe('verao-solidario-2');
    });

    it('should give a same-name campaign of another empresa the slug without suffix', async () => {
      const daPrimeira = await criarHomonima();
      const daOutra = await criarHomonima({ empresaId: new UniqueEntityId() });

      await sut.execute(daPrimeira.id.toString(), admin);
      const response = await sut.execute(daOutra.id.toString(), admin);

      expect(response.isRight()).toBe(true);
      expect((await salva(daOutra)).slug?.valor).toBe('verao-solidario');
    });

    it('should keep the slug of a campaign that already has one', async () => {
      const campanha = await criarHomonima({
        slug: Slug.reconstruir('nome-antigo'),
      });

      const response = await sut.execute(campanha.id.toString(), admin);

      expect(response.isRight()).toBe(true);
      const depois = await salva(campanha);
      expect(depois.status).toBe(CampanhaStatus.APROVADA);
      expect(depois.slug?.valor).toBe('nome-antigo');
    });

    it('should retry with -2 and succeed when a simultaneous approval takes the slug first', async () => {
      const campanha = await criarHomonima();
      campanhaRepository.forcarConflitoDeSlugNoProximoSalvar();

      const response = await sut.execute(campanha.id.toString(), admin);

      expect(response.isRight()).toBe(true);
      const depois = await salva(campanha);
      expect(depois.status).toBe(CampanhaStatus.APROVADA);
      expect(depois.slug?.valor).toBe('verao-solidario-2');
      expect(registroAuditoriaRepository.items).toHaveLength(1);
    });

    it('should still succeed when the slug conflict happens on the first two attempts', async () => {
      const campanha = await criarHomonima();
      jest
        .spyOn(campanhaRepository, 'salvar')
        .mockRejectedValueOnce(new SlugEmUsoError())
        .mockRejectedValueOnce(new SlugEmUsoError());

      const response = await sut.execute(campanha.id.toString(), admin);

      expect(response.isRight()).toBe(true);
      const depois = await salva(campanha);
      expect(depois.status).toBe(CampanhaStatus.APROVADA);
      expect(depois.slug?.valor).toBe('verao-solidario');
    });

    it('should rethrow SlugEmUsoError after 3 conflicting attempts and keep the campaign EM_ANALISE', async () => {
      const campanha = await criarHomonima();
      const salvar = jest
        .spyOn(campanhaRepository, 'salvar')
        .mockRejectedValue(new SlugEmUsoError());

      await expect(
        sut.execute(campanha.id.toString(), admin),
      ).rejects.toBeInstanceOf(SlugEmUsoError);

      expect(salvar).toHaveBeenCalledTimes(3);
      const depois = await salva(campanha);
      expect(depois.status).toBe(CampanhaStatus.EM_ANALISE);
      expect(depois.slug).toBeFalsy();
      expect(registroAuditoriaRepository.items).toHaveLength(0);
    });

    it('should rethrow other save errors without retrying', async () => {
      const campanha = await criarHomonima();
      const falha = new Error('banco indisponível');
      const salvar = jest
        .spyOn(campanhaRepository, 'salvar')
        .mockRejectedValue(falha);

      await expect(sut.execute(campanha.id.toString(), admin)).rejects.toBe(
        falha,
      );

      expect(salvar).toHaveBeenCalledTimes(1);
    });
  });
});
