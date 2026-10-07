import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { MotivoInsuficienteError } from '../errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { TemplateEmail } from '../ports/mailer';
import { RejeitarInstituicaoUseCase } from './rejeitar-instituicao';

const MOTIVO_VALIDO = 'Documentação incompleta para validar o CNPJ informado.';

describe('RejeitarInstituicaoUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let userRepository: InMemoryUserRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let mailer: FakeMailer;
  let sut: RejeitarInstituicaoUseCase;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    userRepository = new InMemoryUserRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    mailer = new FakeMailer();
    sut = new RejeitarInstituicaoUseCase(
      instituicaoRepository,
      userRepository,
      registroAuditoriaRepository,
      mailer,
    );
  });

  async function criarInstituicao(
    status: InstituicaoStatus = InstituicaoStatus.PENDENTE_APROVACAO,
  ) {
    const usuario = UserFactory.create({
      email: 'instituicao@example.com',
      role: UserRole.INSTITUICAO,
    });
    await userRepository.create(usuario);

    const instituicao = InstituicaoFactory.create({
      usuarioId: usuario.id,
      status,
    });
    await instituicaoRepository.create(instituicao);

    return instituicao;
  }

  it('should reject with NotAllowedError (403) and change nothing when the user is not an admin', async () => {
    const instituicao = await criarInstituicao();
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(
      instituicao.id.toString(),
      naoAdmin,
      MOTIVO_VALIDO,
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(NotAllowedError);
    }

    const inalterada = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(inalterada?.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should reject with ResourceNotFoundError (404) when the instituicao does not exist', async () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute('non-existent-id', admin, MOTIVO_VALIDO);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });

  it('should reject with MotivoInsuficienteError (422) and write nothing when the motivo has 19 characters', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(
      instituicao.id.toString(),
      admin,
      'a'.repeat(19),
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(MotivoInsuficienteError);
      if (response.value instanceof MotivoInsuficienteError) {
        expect(response.value.status).toBe(422);
      }
    }

    const inalterada = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(inalterada?.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should accept a motivo with exactly 20 characters', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(
      instituicao.id.toString(),
      admin,
      'a'.repeat(20),
    );

    expect(response.isRight()).toBe(true);
  });

  it('should reject an instituicao with a valid motivo: set REJEITADA + motivoDecisao, write one audit row and send CADASTRO_REJEITADO with the motivo', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(
      instituicao.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );

    expect(response.isRight()).toBe(true);

    const rejeitada = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(rejeitada?.status).toBe(InstituicaoStatus.REJEITADA);
    expect(rejeitada?.motivoDecisao).toBe(MOTIVO_VALIDO);
    expect(rejeitada?.decididoPor?.equals(admin.id)).toBe(true);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0].dados).toEqual(
      expect.objectContaining({
        estadoAnterior: InstituicaoStatus.PENDENTE_APROVACAO,
        estadoNovo: InstituicaoStatus.REJEITADA,
        motivo: MOTIVO_VALIDO,
      }),
    );

    expect(mailer.mensagens).toHaveLength(1);
    expect(mailer.mensagens[0]).toEqual(
      expect.objectContaining({
        para: 'instituicao@example.com',
        template: TemplateEmail.CADASTRO_REJEITADO,
        dados: { motivo: MOTIVO_VALIDO },
      }),
    );
  });

  it.each([
    InstituicaoStatus.APROVADA,
    InstituicaoStatus.REJEITADA,
    InstituicaoStatus.SUSPENSA,
    InstituicaoStatus.INATIVA,
  ])(
    'should reject with TransicaoInvalidaError (409) when the instituicao is %s',
    async (status) => {
      const instituicao = await criarInstituicao(status);
      const admin = UserFactory.create({ role: UserRole.ADMIN });

      const response = await sut.execute(
        instituicao.id.toString(),
        admin,
        MOTIVO_VALIDO,
      );

      expect(response.isLeft()).toBe(true);
      if (response.isLeft()) {
        expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
      }

      const persisted = await instituicaoRepository.findById(
        instituicao.id.toString(),
      );
      expect(persisted?.status).toBe(status);
      expect(registroAuditoriaRepository.items).toHaveLength(0);
      expect(mailer.mensagens).toHaveLength(0);
    },
  );

  it('should still return right and reject the instituicao when the Mailer fails', async () => {
    mailer.forceFailure();
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(
      instituicao.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );

    expect(response.isRight()).toBe(true);

    const rejeitada = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(rejeitada?.status).toBe(InstituicaoStatus.REJEITADA);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should reject with TransicaoInvalidaError and leave no audit or e-mail when salvarTransicao is not applied', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    jest
      .spyOn(instituicaoRepository, 'salvarTransicao')
      .mockResolvedValueOnce(false);

    const response = await sut.execute(
      instituicao.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    }
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });
});
