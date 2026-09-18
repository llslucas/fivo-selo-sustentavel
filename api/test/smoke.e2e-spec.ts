import request from 'supertest';

import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from './helpers/e2e-app';

describe('Harness e2e (smoke)', () => {
  let contexto: AppDeTeste;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('sobe a app de teste conectada ao Postgres de teste', async () => {
    const resultado = await contexto.prisma.$queryRaw<
      { um: number }[]
    >`SELECT 1 AS um`;

    expect(resultado).toEqual([{ um: 1 }]);
  });

  it('responde 404 em GET / (nenhuma rota raiz registrada)', async () => {
    const resposta = await request(servidorHttp(contexto)).get('/');

    expect(resposta.status).toBe(404);
  });

  it('limparBanco remove as linhas de tabelas com FK sem erro de ordem', async () => {
    const usuarioId = '11111111-1111-1111-1111-111111111111';

    await contexto.prisma.usuario.create({
      data: {
        id: usuarioId,
        nome: 'Usuária de Teste',
        email: 'harness@fivo.test',
        senhaHash: 'hash-fake-do-harness',
        role: 'EMPRESA',
        criadoEm: new Date(),
      },
    });

    await contexto.prisma.sessao.create({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        usuarioId,
        tokenHash: 'token-hash-do-harness',
        criadaEm: new Date(),
        ultimoAcessoEm: new Date(),
      },
    });

    await limparBanco(contexto.prisma);

    expect(await contexto.prisma.usuario.count()).toBe(0);
    expect(await contexto.prisma.sessao.count()).toBe(0);
  });
});
