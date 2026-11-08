import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { InstituicaoStatus } from '../entities/instituicao';
import { UserRole } from '@domain/fivo/identidade';
import { FakeVerificadorDeDocumentos } from '@test/doubles/fake-verificador-de-documento';
import { FakeMailer } from '@test/doubles/fake-mailer';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryInstituicaoRepository } from '@test/doubles/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/doubles/in-memory-registro-auditoria-repository';
import { InMemoryUserRepository } from '@test/doubles/in-memory-user-repository';
import { DocumentoIndisponivelError } from '../errors/documento-indisponivel.error';
import { TransicaoInvalidaError, TemplateEmail } from '@domain/fivo/shared';
import { AprovarInstituicaoUseCase } from './aprovar-instituicao';
import { RejeitarInstituicaoUseCase } from './rejeitar-instituicao';

describe('AprovarInstituicaoUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let userRepository: InMemoryUserRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let verificador: FakeVerificadorDeDocumentos;
  let mailer: FakeMailer;
  let sut: AprovarInstituicaoUseCase;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    userRepository = new InMemoryUserRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    verificador = new FakeVerificadorDeDocumentos();
    mailer = new FakeMailer();
    sut = new AprovarInstituicaoUseCase(
      instituicaoRepository,
      userRepository,
      registroAuditoriaRepository,
      verificador,
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

    const response = await sut.execute(instituicao.id.toString(), naoAdmin);

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

    const response = await sut.execute('non-existent-id', admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });

  it('should approve a pending instituicao: set APROVADA + decididoPor, write one audit row and send CADASTRO_APROVADO', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(instituicao.id.toString(), admin);

    expect(response.isRight()).toBe(true);

    const aprovada = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(aprovada?.status).toBe(InstituicaoStatus.APROVADA);
    expect(aprovada?.decididoPor?.equals(admin.id)).toBe(true);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0]).toEqual(
      expect.objectContaining({
        usuarioId: admin.id.toString(),
        entidadeId: instituicao.id.toString(),
      }),
    );
    expect(registroAuditoriaRepository.items[0].criadoEm).toBeInstanceOf(Date);
    expect(registroAuditoriaRepository.items[0].dados).toEqual(
      expect.objectContaining({
        estadoAnterior: InstituicaoStatus.PENDENTE_APROVACAO,
        estadoNovo: InstituicaoStatus.APROVADA,
      }),
    );

    expect(mailer.mensagens).toHaveLength(1);
    expect(mailer.mensagens[0]).toEqual(
      expect.objectContaining({
        para: 'instituicao@example.com',
        template: TemplateEmail.CADASTRO_APROVADO,
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

      const response = await sut.execute(instituicao.id.toString(), admin);

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

  it('should reject with DocumentoIndisponivelError (503) and leave the state unchanged when the document is unreadable', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    verificador.failOnIds = [instituicao.documento.arquivoId.toString()];
    verificador.forceFailure();

    const response = await sut.execute(instituicao.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(DocumentoIndisponivelError);
    expect(response.value).toMatchObject({
      status: 503,
      message: 'Documento temporariamente indisponível',
    });

    const inalterada = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(inalterada?.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should still return right and approve the instituicao when the Mailer fails', async () => {
    mailer.forceFailure();
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(instituicao.id.toString(), admin);

    expect(response.isRight()).toBe(true);

    const aprovada = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(aprovada?.status).toBe(InstituicaoStatus.APROVADA);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should apply only one of two concurrent decisions and answer the other with TransicaoInvalidaError', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });
    const rejeitar = new RejeitarInstituicaoUseCase(
      instituicaoRepository,
      userRepository,
      registroAuditoriaRepository,
      mailer,
    );

    const [aprovacao, rejeicao] = await Promise.all([
      sut.execute(instituicao.id.toString(), admin),
      rejeitar.execute(
        instituicao.id.toString(),
        admin,
        'Documentação incompleta para validar o CNPJ informado.',
      ),
    ]);

    const resultados = [aprovacao, rejeicao];
    expect(resultados.filter((r) => r.isRight())).toHaveLength(1);
    const perdedora = resultados.find((r) => r.isLeft());
    expect(perdedora?.value).toBeInstanceOf(TransicaoInvalidaError);

    const estadoVencedor = aprovacao.isRight()
      ? InstituicaoStatus.APROVADA
      : InstituicaoStatus.REJEITADA;
    const persistida = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(persistida?.status).toBe(estadoVencedor);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0].dados).toEqual(
      expect.objectContaining({ estadoNovo: estadoVencedor }),
    );
  });

  it('should reject with TransicaoInvalidaError and leave no audit or e-mail when salvarTransicao is not applied', async () => {
    const instituicao = await criarInstituicao();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    jest
      .spyOn(instituicaoRepository, 'salvarTransicao')
      .mockResolvedValueOnce(false);

    const response = await sut.execute(instituicao.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    }
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });
});
