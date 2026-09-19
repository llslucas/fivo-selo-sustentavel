import { UserFactory } from '@test/factories/user-factory';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { InMemoryTokenSenhaRepository } from '@test/repositories/in-memory-token-senha-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { Mailer, MensagemEmail, TemplateEmail } from '../ports/mailer';
import { SolicitarRecuperacaoSenhaUseCase } from './solicitar-recuperacao-senha';

const AGORA = new Date('2026-01-01T12:00:00Z');

/** Mailer cujo envio só termina quando o teste manda. */
class MailerControlado implements Mailer {
  public chamadas: MensagemEmail[] = [];
  public concluido = false;
  private resolver?: () => void;

  enviar(mensagem: MensagemEmail): Promise<void> {
    this.chamadas.push(mensagem);

    return new Promise<void>((resolve) => {
      this.resolver = resolve;
    });
  }

  concluir(): void {
    this.concluido = true;
    this.resolver?.();
  }
}

describe('SolicitarRecuperacaoSenhaUseCase', () => {
  let userRepository: InMemoryUserRepository;
  let tokenSenhaRepository: InMemoryTokenSenhaRepository;
  let mailer: FakeMailer;
  let sut: SolicitarRecuperacaoSenhaUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    tokenSenhaRepository = new InMemoryTokenSenhaRepository();
    mailer = new FakeMailer();
    sut = new SolicitarRecuperacaoSenhaUseCase(
      userRepository,
      tokenSenhaRepository,
      mailer,
    );
  });

  it('should return right, create a TokenSenha expiring in 60min and send SENHA_REDEFINICAO when the account exists', async () => {
    const user = UserFactory.create({ email: 'john@example.com' });
    await userRepository.create(user);

    const response = await sut.execute({
      email: 'john@example.com',
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);

    expect(tokenSenhaRepository.items).toHaveLength(1);
    const tokenSenha = tokenSenhaRepository.items[0];
    expect(tokenSenha.usuarioId).toBe(user.id.toString());
    expect(tokenSenha.expiraEm.getTime()).toBe(AGORA.getTime() + 60 * 60_000);

    expect(mailer.mensagens).toHaveLength(1);
    expect(mailer.mensagens[0]).toEqual(
      expect.objectContaining({
        para: 'john@example.com',
        template: TemplateEmail.SENHA_REDEFINICAO,
      }),
    );
  });

  it('should still return right, and create nothing / send nothing, when the account does not exist (no enumeration)', async () => {
    const response = await sut.execute({
      email: 'ghost@example.com',
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);
    expect(tokenSenhaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should resolve with the token already persisted, before the e-mail delivery finishes', async () => {
    const mailerControlado = new MailerControlado();
    const sutControlado = new SolicitarRecuperacaoSenhaUseCase(
      userRepository,
      tokenSenhaRepository,
      mailerControlado,
    );
    const user = UserFactory.create({ email: 'john@example.com' });
    await userRepository.create(user);

    const response = await sutControlado.execute({
      email: 'john@example.com',
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);
    expect(mailerControlado.chamadas).toHaveLength(1);
    expect(mailerControlado.concluido).toBe(false);
    expect(tokenSenhaRepository.items).toHaveLength(1);
    expect(tokenSenhaRepository.items[0].usuarioId).toBe(user.id.toString());

    mailerControlado.concluir();
  });

  it('should still resolve right and log the failure when the Mailer rejects, with no unhandled exception', async () => {
    mailer.forceFailure();
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const user = UserFactory.create({ email: 'john@example.com' });
    await userRepository.create(user);

    const response = await sut.execute({
      email: 'john@example.com',
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);
    expect(tokenSenhaRepository.items).toHaveLength(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Falha ao enviar e-mail de recuperação de senha',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
