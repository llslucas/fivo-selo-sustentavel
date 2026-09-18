import { createHash } from 'node:crypto';
import { UserFactory } from '@test/factories/user-factory';
import { FakeHasher } from '@test/cryptography/fake-hasher';
import { InMemorySessaoRepository } from '@test/repositories/in-memory-sessao-repository';
import { InMemoryTokenSenhaRepository } from '@test/repositories/in-memory-token-senha-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { Senha } from '@domain/fivo/entities/senha';
import { SenhaFracaError } from '../errors/senha-fraca.error';
import { TokenInvalidoError } from '../errors/token-invalido.error';
import { RedefinirSenhaUseCase } from './redefinir-senha';

const AGORA = new Date('2026-01-01T12:00:00Z');
const TOKEN_BRUTO = 'token-de-teste-com-256-bits-simulado';
const TOKEN_HASH = createHash('sha256').update(TOKEN_BRUTO).digest('hex');
const SENHA_ANTIGA = 'SenhaAntiga123';
const SENHA_NOVA = 'SenhaNovaForte123';

describe('RedefinirSenhaUseCase', () => {
  let tokenSenhaRepository: InMemoryTokenSenhaRepository;
  let userRepository: InMemoryUserRepository;
  let sessaoRepository: InMemorySessaoRepository;
  let hasher: FakeHasher;
  let sut: RedefinirSenhaUseCase;

  beforeEach(() => {
    tokenSenhaRepository = new InMemoryTokenSenhaRepository();
    userRepository = new InMemoryUserRepository();
    sessaoRepository = new InMemorySessaoRepository();
    hasher = new FakeHasher();
    sut = new RedefinirSenhaUseCase(
      tokenSenhaRepository,
      userRepository,
      hasher,
      sessaoRepository,
    );
  });

  async function criarUsuarioComTokenValido() {
    const senhaOrError = Senha.create(SENHA_ANTIGA);
    if (senhaOrError.isLeft()) throw new Error('invalid senha fixture');
    const senhaHash = await senhaOrError.value.hash(hasher);

    const user = UserFactory.create({ senha: senhaHash });
    await userRepository.create(user);

    await tokenSenhaRepository.criar({
      id: 'token-1',
      usuarioId: user.id.toString(),
      tokenHash: TOKEN_HASH,
      criadoEm: AGORA,
      expiraEm: new Date(AGORA.getTime() + 60 * 60_000),
    });

    return user;
  }

  it('should update the password hash and mark the token as used with a valid token', async () => {
    const user = await criarUsuarioComTokenValido();

    const response = await sut.execute({
      token: TOKEN_BRUTO,
      novaSenha: SENHA_NOVA,
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);

    const updated = await userRepository.findById(user.id.toString());
    expect(updated?.senha.valor).toBe(`${SENHA_NOVA}-hashed`);

    const tokenSenha = tokenSenhaRepository.items[0];
    expect(tokenSenha.usadoEm).toBeInstanceOf(Date);
  });

  it('should revoke all active sessions of the account', async () => {
    const user = await criarUsuarioComTokenValido();
    await sessaoRepository.criar({
      id: 'sessao-1',
      usuarioId: user.id.toString(),
      tokenHash: 'hash-1',
      criadaEm: AGORA,
      ultimoAcessoEm: AGORA,
    });
    await sessaoRepository.criar({
      id: 'sessao-2',
      usuarioId: user.id.toString(),
      tokenHash: 'hash-2',
      criadaEm: AGORA,
      ultimoAcessoEm: AGORA,
    });

    const response = await sut.execute({
      token: TOKEN_BRUTO,
      novaSenha: SENHA_NOVA,
      agora: AGORA,
    });

    expect(response.isRight()).toBe(true);
    expect(sessaoRepository.items.every((sessao) => sessao.revogadaEm)).toBe(
      true,
    );
  });

  it('should reject with TokenInvalidoError (400) when the token does not exist', async () => {
    const response = await sut.execute({
      token: 'token-inexistente',
      novaSenha: SENHA_NOVA,
      agora: AGORA,
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TokenInvalidoError);
      if (response.value instanceof TokenInvalidoError) {
        expect(response.value.status).toBe(400);
        expect(response.value.message).toBe(
          'Link de redefinição inválido ou expirado',
        );
      }
    }
  });

  it('should reject with TokenInvalidoError (400) when the token was already used', async () => {
    const user = await criarUsuarioComTokenValido();
    await tokenSenhaRepository.marcarUsado('token-1');

    const response = await sut.execute({
      token: TOKEN_BRUTO,
      novaSenha: SENHA_NOVA,
      agora: AGORA,
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TokenInvalidoError);
    }

    const updated = await userRepository.findById(user.id.toString());
    expect(updated?.senha.valor).toBe(`${SENHA_ANTIGA}-hashed`);
  });

  it('should reject with TokenInvalidoError (400) when the token has expired', async () => {
    await criarUsuarioComTokenValido();
    const depoisDaExpiracao = new Date(AGORA.getTime() + 61 * 60_000);

    const response = await sut.execute({
      token: TOKEN_BRUTO,
      novaSenha: SENHA_NOVA,
      agora: depoisDaExpiracao,
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TokenInvalidoError);
    }
  });

  it('should reject with SenhaFracaError (422) when the new password has less than 10 characters', async () => {
    await criarUsuarioComTokenValido();

    const response = await sut.execute({
      token: TOKEN_BRUTO,
      novaSenha: 'curta123',
      agora: AGORA,
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(SenhaFracaError);
    }
  });

  it('should make the old password stop working after the reset', async () => {
    const user = await criarUsuarioComTokenValido();

    await sut.execute({
      token: TOKEN_BRUTO,
      novaSenha: SENHA_NOVA,
      agora: AGORA,
    });

    const updated = await userRepository.findById(user.id.toString());
    const senhaAntigaAindaFunciona = await hasher.compare(
      SENHA_ANTIGA,
      updated!.senha.valor,
    );

    expect(senhaAntigaAindaFunciona).toBe(false);
  });
});
