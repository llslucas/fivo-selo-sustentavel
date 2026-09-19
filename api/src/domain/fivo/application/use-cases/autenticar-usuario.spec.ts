import { createHash } from 'node:crypto';
import { UserRole } from '@domain/fivo/entities/user';
import { Senha } from '@domain/fivo/entities/senha';
import { FakeHasher } from '@test/cryptography/fake-hasher';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryUnitOfWork } from '@test/repositories/in-memory-unit-of-work';
import { InMemorySessaoRepository } from '@test/repositories/in-memory-sessao-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { ContaBloqueadaError } from '../errors/conta-bloqueada.error';
import { CredenciaisInvalidasError } from '../errors/wrong-credentials.error';
import { AutenticarUsuarioUseCase } from './autenticar-usuario';

const SENHA_CORRETA = 'SenhaForte123';
const AGORA = new Date('2026-01-01T12:00:00Z');

describe('AutenticarUsuarioUseCase', () => {
  let userRepository: InMemoryUserRepository;
  let sessaoRepository: InMemorySessaoRepository;
  let hasher: FakeHasher;
  let sut: AutenticarUsuarioUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    sessaoRepository = new InMemorySessaoRepository();
    hasher = new FakeHasher();
    sut = new AutenticarUsuarioUseCase(
      userRepository,
      hasher,
      sessaoRepository,
      new InMemoryUnitOfWork(),
    );
  });

  async function criarUsuario(overrides: Partial<{ email: string }> = {}) {
    const senhaOrError = Senha.create(SENHA_CORRETA);
    if (senhaOrError.isLeft()) throw new Error('invalid senha fixture');
    const senhaHash = await senhaOrError.value.hash(hasher);

    const user = UserFactory.create({
      email: overrides.email ?? 'john@example.com',
      senha: senhaHash,
      role: UserRole.EMPRESA,
    });
    await userRepository.create(user);
    return user;
  }

  it('should reject with CredenciaisInvalidasError (401) when the e-mail does not exist', async () => {
    const response = await sut.execute({
      email: 'ghost@example.com',
      senha: SENHA_CORRETA,
      agora: AGORA,
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(CredenciaisInvalidasError);
      expect(response.value.status).toBe(401);
      expect(response.value.message).toBe('Credenciais inválidas');
    }
  });

  it('should reject with the same CredenciaisInvalidasError (401) when the password is wrong, indistinguishable from an unknown e-mail', async () => {
    await criarUsuario();

    const response = await sut.execute({
      email: 'john@example.com',
      senha: 'senha-errada-123',
      agora: AGORA,
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(CredenciaisInvalidasError);
      expect(response.value.status).toBe(401);
      expect(response.value.message).toBe('Credenciais inválidas');
    }
  });

  it('should block the account with ContaBloqueadaError (429) after 5 failed attempts, even with the correct password', async () => {
    await criarUsuario();

    for (let tentativa = 1; tentativa <= 5; tentativa++) {
      const response = await sut.execute({
        email: 'john@example.com',
        senha: 'senha-errada-123',
        agora: AGORA,
      });

      expect(response.isLeft()).toBe(true);
      if (response.isLeft()) {
        expect(response.value).toBeInstanceOf(CredenciaisInvalidasError);
      }
    }

    const sextaTentativa = await sut.execute({
      email: 'john@example.com',
      senha: SENHA_CORRETA,
      agora: AGORA,
    });

    expect(sextaTentativa.isLeft()).toBe(true);
    if (sextaTentativa.isLeft()) {
      expect(sextaTentativa.value).toBeInstanceOf(ContaBloqueadaError);
      expect(sextaTentativa.value.status).toBe(429);
    }
  });

  it('should reset the failure counters on a successful login', async () => {
    const user = await criarUsuario();

    await sut.execute({
      email: 'john@example.com',
      senha: 'senha-errada-123',
      agora: AGORA,
    });
    await sut.execute({
      email: 'john@example.com',
      senha: 'senha-errada-123',
      agora: AGORA,
    });

    const response = await sut.execute({
      email: 'john@example.com',
      senha: SENHA_CORRETA,
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);

    const updated = await userRepository.findById(user.id.toString());
    expect(updated?.falhasLogin).toBe(0);
    expect(updated?.bloqueadoAte).toBeNull();
  });

  it('should return right({ token, papel }) on success', async () => {
    await criarUsuario();

    const response = await sut.execute({
      email: 'john@example.com',
      senha: SENHA_CORRETA,
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);
    if (response.isRight()) {
      expect(response.value.token).toMatch(/^[0-9a-f]{64}$/);
      expect(response.value.papel).toBe(UserRole.EMPRESA);
    }
  });

  it('should persist a sessao row with the sha256 hash of the token, never the raw token', async () => {
    await criarUsuario();

    const response = await sut.execute({
      email: 'john@example.com',
      senha: SENHA_CORRETA,
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    expect(sessaoRepository.items).toHaveLength(1);
    const sessao = sessaoRepository.items[0];

    const hashEsperado = createHash('sha256')
      .update(response.value.token)
      .digest('hex');

    expect(sessao.tokenHash).toBe(hashEsperado);
    expect(sessao.tokenHash).not.toBe(response.value.token);
  });

  it('should persist the ip and the userAgent received in the request on the sessao', async () => {
    await criarUsuario();

    const response = await sut.execute({
      email: 'john@example.com',
      senha: SENHA_CORRETA,
      agora: AGORA,
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (Teste)',
    });

    expect(response.isRight()).toBe(true);
    expect(sessaoRepository.items).toHaveLength(1);
    expect(sessaoRepository.items[0].ip).toBe('203.0.113.7');
    expect(sessaoRepository.items[0].userAgent).toBe('Mozilla/5.0 (Teste)');
  });
});
