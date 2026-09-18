import { randomUUID } from 'node:crypto';

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import {
  Sessao,
  SessaoRepository,
} from '@domain/fivo/application/ports/sessao-repository';
import { User } from '@domain/fivo/entities/user';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

function sessaoDe(usuario: User, sobrescritas: Partial<Sessao> = {}): Sessao {
  return {
    id: randomUUID(),
    usuarioId: usuario.id.toString(),
    tokenHash: `sha256-${randomUUID()}`,
    criadaEm: new Date('2026-01-01T10:00:00.000Z'),
    ultimoAcessoEm: new Date('2026-01-01T10:00:00.000Z'),
    ip: '203.0.113.10',
    userAgent: 'jest/e2e',
    ...sobrescritas,
  };
}

describe('PrismaSessaoRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: SessaoRepository;
  let userRepository: UserRepository;
  let usuario: User;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(SessaoRepository);
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

  it('criar seguido de buscarPorTokenHash devolve a sessão persistida', async () => {
    const sessao = sessaoDe(usuario);

    await repository.criar(sessao);

    const encontrada = await repository.buscarPorTokenHash(sessao.tokenHash);

    expect(encontrada).not.toBeNull();
    expect(encontrada!.id).toBe(sessao.id);
    expect(encontrada!.usuarioId).toBe(usuario.id.toString());
    expect(encontrada!.tokenHash).toBe(sessao.tokenHash);
    expect(encontrada!.criadaEm.getTime()).toBe(sessao.criadaEm.getTime());
    expect(encontrada!.ultimoAcessoEm.getTime()).toBe(
      sessao.ultimoAcessoEm.getTime(),
    );
    expect(encontrada!.revogadaEm).toBeNull();
    expect(encontrada!.ip).toBe('203.0.113.10');
    expect(encontrada!.userAgent).toBe('jest/e2e');
  });

  it('buscarPorTokenHash devolve null para um hash desconhecido', async () => {
    const encontrada = await repository.buscarPorTokenHash('hash-inexistente');

    expect(encontrada).toBeNull();
  });

  it('deslizar atualiza ultimoAcessoEm sem mexer em criadaEm', async () => {
    const sessao = sessaoDe(usuario);
    await repository.criar(sessao);

    const agora = new Date('2026-01-01T12:34:56.000Z');
    await repository.deslizar(sessao.id, agora);

    const encontrada = await repository.buscarPorTokenHash(sessao.tokenHash);

    expect(encontrada!.ultimoAcessoEm.getTime()).toBe(agora.getTime());
    expect(encontrada!.criadaEm.getTime()).toBe(sessao.criadaEm.getTime());
  });

  it('revogar marca a sessão com revogadaEm', async () => {
    const sessao = sessaoDe(usuario);
    await repository.criar(sessao);

    await repository.revogar(sessao.id);

    const encontrada = await repository.buscarPorTokenHash(sessao.tokenHash);

    expect(encontrada!.revogadaEm).toBeInstanceOf(Date);
  });

  it('revogarTodasDoUsuario marca todas as sessões do usuário e preserva as de outro', async () => {
    const outroUsuario = UserFactory.create({
      email: `outro-${randomUUID()}@fivo.test`,
    });
    await userRepository.create(outroUsuario);

    const primeira = sessaoDe(usuario);
    const segunda = sessaoDe(usuario);
    const deOutroUsuario = sessaoDe(outroUsuario);

    await repository.criar(primeira);
    await repository.criar(segunda);
    await repository.criar(deOutroUsuario);

    await repository.revogarTodasDoUsuario(usuario.id.toString());

    const primeiraEncontrada = await repository.buscarPorTokenHash(
      primeira.tokenHash,
    );
    const segundaEncontrada = await repository.buscarPorTokenHash(
      segunda.tokenHash,
    );
    const intocada = await repository.buscarPorTokenHash(
      deOutroUsuario.tokenHash,
    );

    expect(primeiraEncontrada!.revogadaEm).toBeInstanceOf(Date);
    expect(segundaEncontrada!.revogadaEm).toBeInstanceOf(Date);
    expect(intocada!.revogadaEm).toBeNull();
  });
});
