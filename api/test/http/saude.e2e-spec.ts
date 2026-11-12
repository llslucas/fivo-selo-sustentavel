import request from 'supertest';

import {
  AppDeTeste,
  criarAppDeTeste,
  servidorHttp,
} from '@test/helpers/e2e-app';

describe('GET /health (e2e)', () => {
  let contexto: AppDeTeste;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('responde 200 sem sessão quando o banco está acessível', async () => {
    const resposta = await request(servidorHttp(contexto)).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
    expect(resposta.headers['cache-control']).toBe('no-store');
  });

  it('responde 503 sem detalhes de infraestrutura quando o banco falha', async () => {
    const consulta = jest
      .spyOn(contexto.prisma, '$queryRaw')
      .mockRejectedValueOnce(new Error('conexão recusada em postgres:5432'));

    const resposta = await request(servidorHttp(contexto)).get('/health');

    consulta.mockRestore();
    expect(resposta.status).toBe(503);
    expect(JSON.stringify(resposta.body)).not.toContain('postgres');
    expect(resposta.headers['cache-control']).toBe('no-store');
  });
});
