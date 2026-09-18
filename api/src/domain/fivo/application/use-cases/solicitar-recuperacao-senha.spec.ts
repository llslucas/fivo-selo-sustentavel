import { UserFactory } from '@test/factories/user-factory';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { InMemoryTokenSenhaRepository } from '@test/repositories/in-memory-token-senha-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { TemplateEmail } from '../ports/mailer';
import { SolicitarRecuperacaoSenhaUseCase } from './solicitar-recuperacao-senha';

const AGORA = new Date('2026-01-01T12:00:00Z');

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
});
