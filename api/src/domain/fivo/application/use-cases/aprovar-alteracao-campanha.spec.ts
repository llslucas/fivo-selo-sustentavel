import { Either } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { AlteracaoStatus } from '@domain/fivo/entities/alteracao-compromisso';
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
import { AprovarAlteracaoCampanhaUseCase } from './aprovar-alteracao-campanha';
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

type Repositorios = {
  instituicoes: InMemoryInstituicaoRepository;
  causas: InMemoryCausaRepository;
};

describe('AprovarAlteracaoCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let sut: AprovarAlteracaoCampanhaUseCase;

  const admin = UserFactory.create({ role: UserRole.ADMIN });

  beforeEach(() => {
    campanhaRepository = new InMemoryCampanhaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = new AprovarAlteracaoCampanhaUseCase(
      campanhaRepository,
      registroAuditoriaRepository,
      new AssegurarBeneficiadaDisponivelUseCase(
        instituicaoRepository,
        causaRepository,
      ),
    );
  });

  // Alteração padrão da factory: troca só a regra de doação.
  async function criarComAlteracaoDeRegra(): Promise<Campanha> {
    const campanha = CampanhaFactory.aprovadaComAlteracao();
    await campanhaRepository.create(campanha);
    return campanha;
  }

  async function criarComNovaBeneficiada(
    beneficiada: Beneficiada,
  ): Promise<Campanha> {
    const base = CampanhaFactory.aprovada();
    const proposto = base.compromissoVigente()!.mesclar({ beneficiada });
    const campanha = CampanhaFactory.aprovadaComAlteracao(
      {
        beneficiada: base.beneficiada,
        regraDoacao: base.regraDoacao,
        vigencia: base.vigencia,
      },
      { proposto },
    );
    await campanhaRepository.create(campanha);
    return campanha;
  }

  afterEach(() => {
    jest.useRealTimers();
  });

  async function salva(campanha: Campanha): Promise<Campanha> {
    return (await campanhaRepository.findById(campanha.id.toString()))!;
  }

  it('should reject with NotAllowedError (403) and change nothing when the user is not an admin', async () => {
    const campanha = await criarComAlteracaoDeRegra();
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(campanha.id.toString(), naoAdmin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(NotAllowedError);
    const depois = await salva(campanha);
    expect(depois.alteracaoPendente?.status).toBe(AlteracaoStatus.EM_ANALISE);
    expect(depois.versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(campanhaRepository.alteracoesDecididas).toHaveLength(0);
  });

  it('should reject with ResourceNotFoundError (404) when the campaign does not exist', async () => {
    const response = await sut.execute('non-existent-id', admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should reject with TransicaoInvalidaError when there is no pending change', async () => {
    const campanha = CampanhaFactory.aprovada();
    await campanhaRepository.create(campanha);

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    expect((await salva(campanha)).versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });

  it('should apply the proposed commitment, clear the pending change and audit both commitments', async () => {
    const campanha = await criarComAlteracaoDeRegra();
    const { anterior, proposto } = campanha.alteracaoPendente!;

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isRight()).toBe(true);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.APROVADA);
    expect(depois.compromissoVigente()?.equals(proposto)).toBe(true);
    expect(depois.alteracaoPendente).toBeFalsy();
    expect(depois.versao).toBe(campanha.versao + 1);
    expect(depois.idPublico.equals(campanha.idPublico)).toBe(true);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    const [registro] = registroAuditoriaRepository.items;
    expect(registro.tipo).toBe('ALTERACAO_CAMPANHA_APROVADA');
    expect(registro.usuarioId).toBe(admin.id.toString());
    expect(registro.entidadeId).toBe(campanha.id.toString());
    expect(registro.dados).toEqual({
      compromissoAnterior: expect.objectContaining({
        regraDoacao: expect.objectContaining({
          tipo: anterior.regraDoacao.tipo,
        }) as unknown,
      }) as unknown,
      compromissoNovo: expect.objectContaining({
        regraDoacao: expect.objectContaining({
          tipo: proposto.regraDoacao.tipo,
          percentualCentesimos: 1000,
        }) as unknown,
      }) as unknown,
    });
  });

  it('should save the decided change with status APROVADA, the admin and the decision time', async () => {
    const agora = new Date('2026-10-21T15:00:00Z');
    jest.useFakeTimers({ now: agora });
    const campanha = await criarComAlteracaoDeRegra();
    const alteracao = campanha.alteracaoPendente!;

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isRight()).toBe(true);
    expect(campanhaRepository.alteracoesDecididas).toHaveLength(1);
    const [decidida] = campanhaRepository.alteracoesDecididas;
    expect(decidida.id.equals(alteracao.id)).toBe(true);
    expect(decidida.campanhaId.equals(campanha.id)).toBe(true);
    expect(decidida.status).toBe(AlteracaoStatus.APROVADA);
    expect(decidida.decididoPor?.equals(admin.id)).toBe(true);
    expect(decidida.decididoEm).toEqual(agora);
    expect(decidida.motivo).toBeFalsy();
  });

  it('should apply a new beneficiary that is still available', async () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);
    const nova = valor(
      Beneficiada.criar({ instituicaoId: instituicao.id.toString() }),
    );
    const campanha = await criarComNovaBeneficiada(nova);

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isRight()).toBe(true);
    expect((await salva(campanha)).beneficiada?.equals(nova)).toBe(true);
  });

  it.each([
    [
      'a non-approved institution',
      async (repos: Repositorios): Promise<Beneficiada> => {
        const instituicao = InstituicaoFactory.create({
          status: InstituicaoStatus.SUSPENSA,
        });
        await repos.instituicoes.create(instituicao);
        return valor(
          Beneficiada.criar({ instituicaoId: instituicao.id.toString() }),
        );
      },
    ],
    [
      'an inactive cause',
      async (repos: Repositorios): Promise<Beneficiada> => {
        const causa = CausaFactory.create({ status: CausaStatus.INATIVA });
        await repos.causas.create(causa);
        return valor(Beneficiada.criar({ causaId: causa.id.toString() }));
      },
    ],
    [
      'a missing institution',
      (): Promise<Beneficiada> =>
        Promise.resolve(
          valor(Beneficiada.criar({ instituicaoId: 'non-existent-id' })),
        ),
    ],
  ])(
    'should reject with BeneficiadaIndisponivelNaDecisaoError (409) and apply nothing when the new beneficiary is %s',
    async (_caso, criarBeneficiada) => {
      const nova = await criarBeneficiada({
        instituicoes: instituicaoRepository,
        causas: causaRepository,
      });
      const campanha = await criarComNovaBeneficiada(nova);
      const vigente = campanha.compromissoVigente()!;

      const response = await sut.execute(campanha.id.toString(), admin);

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(
        BeneficiadaIndisponivelNaDecisaoError,
      );
      const depois = await salva(campanha);
      expect(depois.compromissoVigente()?.equals(vigente)).toBe(true);
      expect(depois.alteracaoPendente?.status).toBe(AlteracaoStatus.EM_ANALISE);
      expect(depois.versao).toBe(campanha.versao);
      expect(registroAuditoriaRepository.items).toHaveLength(0);
      expect(campanhaRepository.alteracoesDecididas).toHaveLength(0);
    },
  );

  it('should reject with TransicaoInvalidaError when another operation saved the campaign first', async () => {
    campanhaRepository = new RepositorioComGravacaoConcorrente();
    sut = new AprovarAlteracaoCampanhaUseCase(
      campanhaRepository,
      registroAuditoriaRepository,
      new AssegurarBeneficiadaDisponivelUseCase(
        instituicaoRepository,
        causaRepository,
      ),
    );
    const campanha = await criarComAlteracaoDeRegra();
    const original = campanha.compromissoVigente()!;

    const response = await sut.execute(campanha.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    const depois = await salva(campanha);
    expect(depois.compromissoVigente()?.equals(original)).toBe(true);
    expect(depois.alteracaoPendente?.status).toBe(AlteracaoStatus.EM_ANALISE);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(campanhaRepository.alteracoesDecididas).toHaveLength(0);
  });
});
