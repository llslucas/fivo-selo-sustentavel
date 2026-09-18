import { randomUUID } from 'node:crypto';

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import {
  TokenSenha,
  TokenSenhaRepository,
} from '@domain/fivo/application/ports/token-senha-repository';
import { User } from '@domain/fivo/entities/user';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

function tokenDe(
  usuario: User,
  sobrescritas: Partial<TokenSenha> = {},
): TokenSenha {
  return {
    id: randomUUID(),
    usuarioId: usuario.id.toString(),
    tokenHash: `sha256-${randomUUID()}`,
    criadoEm: new Date('2026-01-01T10:00:00.000Z'),
    expiraEm: new Date('2026-01-01T11:00:00.000Z'),
    ...sobrescritas,
  };
}

describe('PrismaTokenSenhaRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: TokenSenhaRepository;
  let userRepository: UserRepository;
  let usuario: User;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(TokenSenhaRepository);
    userRepository = contexto.app.get(UserRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);

    usuario = UserFactory.create({ email: `dono-${randomUUID()}@fivo.test` });
    await userRepository.create(usuario);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('criar seguido de buscarPorHash devolve o token persistido', async () => {
    const token = tokenDe(usuario);

    await repository.criar(token);

    const encontrado = await repository.buscarPorHash(token.tokenHash);

    expect(encontrado).not.toBeNull();
    expect(encontrado!.id).toBe(token.id);
    expect(encontrado!.usuarioId).toBe(usuario.id.toString());
    expect(encontrado!.criadoEm.getTime()).toBe(token.criadoEm.getTime());
    expect(encontrado!.expiraEm.getTime()).toBe(token.expiraEm.getTime());
    expect(encontrado!.usadoEm).toBeNull();
  });

  it('buscarPorHash devolve null para um hash desconhecido', async () => {
    const encontrado = await repository.buscarPorHash('hash-inexistente');

    expect(encontrado).toBeNull();
  });

  it('marcarUsado registra a data de uso do token', async () => {
    const token = tokenDe(usuario);
    await repository.criar(token);

    await repository.marcarUsado(token.id);

    const encontrado = await repository.buscarPorHash(token.tokenHash);

    expect(encontrado!.usadoEm).toBeInstanceOf(Date);
  });
});
