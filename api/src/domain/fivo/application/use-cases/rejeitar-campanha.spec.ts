import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Campanha, CampanhaStatus } from '@domain/fivo/entities/campanha';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCampanhaRepository } from '@test/repositories/in-memory-campanha-repository';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { MotivoInsuficienteError } from '../errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { TemplateEmail } from '../ports/mailer';
import { RejeitarCampanhaUseCase } from './rejeitar-campanha';

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

describe('RejeitarCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let mailer: FakeMailer;
  let sut: RejeitarCampanhaUseCase;

  const admin = UserFactory.create({ role: UserRole.ADMIN });
  const motivo = 'A regra de doação não está clara para o consumidor';

  function criarSut(): RejeitarCampanhaUseCase {
    return new RejeitarCampanhaUseCase(
      campanhaRepository,
      empresaRepository,
      userRepository,
      registroAuditoriaRepository,
      mailer,
    );
  }

  beforeEach(() => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    mailer = new FakeMailer();
    sut = criarSut();
  });

  // Campanha em análise de uma empresa cujo dono tem e-mail cadastrado.
  async function criarEmAnalise(
    status: CampanhaStatus = CampanhaStatus.EM_ANALISE,
  ) {
    const dono = UserFactory.create({
      role: UserRole.EMPRESA,
      email: 'dono@empresa.com',
    });
    await userRepository.create(dono);
    const empresa = EmpresaFactory.create({ usuarioId: dono.id });
    await empresaRepository.create(empresa);
    const campanha = CampanhaFactory.emAnalise({
      status,
      empresaId: empresa.id,
    });
    await campanhaRepository.create(campanha);
    return campanha;
  }

  async function salva(campanha: Campanha): Promise<Campanha> {
    return (await campanhaRepository.findById(campanha.id.toString()))!;
  }

  it('should reject the campaign, keep the reason, audit it and e-mail the owner', async () => {
    const campanha = await criarEmAnalise();

    const response = await sut.execute(campanha.id.toString(), admin, motivo);

    expect(response.isRight()).toBe(true);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.REJEITADA);
    expect(depois.motivoUltimaRejeicao).toBe(motivo);
    expect(depois.decididoPor?.equals(admin.id)).toBe(true);
    expect(depois.versao).toBe(campanha.versao + 1);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    const [registro] = registroAuditoriaRepository.items;
    expect(registro.tipo).toBe('CAMPANHA_REJEITADA');
    expect(registro.usuarioId).toBe(admin.id.toString());
    expect(registro.entidadeId).toBe(campanha.id.toString());
    expect(registro.dados).toEqual({
      estadoAnterior: CampanhaStatus.EM_ANALISE,
      estadoNovo: CampanhaStatus.REJEITADA,
      motivo,
    });

    expect(mailer.mensagens).toEqual([
      {
        para: 'dono@empresa.com',
        template: TemplateEmail.CAMPANHA_REJEITADA,
        dados: { nomeCampanha: campanha.nome.valor, motivo },
      },
    ]);
  });

  it('should reject with NotAllowedError (403) and change nothing when the user is not an admin', async () => {
    const campanha = await criarEmAnalise();
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(
      campanha.id.toString(),
      naoAdmin,
      motivo,
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(NotAllowedError);
    expect((await salva(campanha)).status).toBe(CampanhaStatus.EM_ANALISE);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should reject with ResourceNotFoundError (404) when the campaign does not exist', async () => {
    const response = await sut.execute('non-existent-id', admin, motivo);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should reject with MotivoInsuficienteError and save nothing when the reason has 19 characters', async () => {
    const campanha = await criarEmAnalise();

    const response = await sut.execute(
      campanha.id.toString(),
      admin,
      'a'.repeat(19),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(MotivoInsuficienteError);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(depois.motivoUltimaRejeicao).toBeFalsy();
    expect(depois.versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should keep the rejection when sending the e-mail fails', async () => {
    const campanha = await criarEmAnalise();
    mailer.forceFailure();
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await sut.execute(campanha.id.toString(), admin, motivo);

    expect(response.isRight()).toBe(true);
    expect((await salva(campanha)).status).toBe(CampanhaStatus.REJEITADA);
    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('should reject with TransicaoInvalidaError when the campaign is not under review', async () => {
    const campanha = await criarEmAnalise(CampanhaStatus.RASCUNHO);

    const response = await sut.execute(campanha.id.toString(), admin, motivo);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    expect((await salva(campanha)).status).toBe(CampanhaStatus.RASCUNHO);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should reject with TransicaoInvalidaError when another decision saved the campaign first', async () => {
    campanhaRepository = new RepositorioComGravacaoConcorrente();
    sut = criarSut();
    const campanha = await criarEmAnalise();

    const response = await sut.execute(campanha.id.toString(), admin, motivo);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    expect((await salva(campanha)).status).toBe(CampanhaStatus.EM_ANALISE);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });
});
