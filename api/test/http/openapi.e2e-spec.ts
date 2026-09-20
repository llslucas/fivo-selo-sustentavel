import request from 'supertest';

import { NOME_COOKIE_SESSAO } from '@infra/auth/auth.constants';
import {
  AppDeTeste,
  criarAppDeTeste,
  servidorHttp,
} from '@test/helpers/e2e-app';

async function comAmbiente(
  ambiente: { NODE_ENV?: string; SWAGGER_ENABLED?: string },
  teste: (contexto: AppDeTeste) => Promise<void>,
): Promise<void> {
  const anterior = {
    NODE_ENV: process.env.NODE_ENV,
    SWAGGER_ENABLED: process.env.SWAGGER_ENABLED,
  };

  for (const [chave, valor] of Object.entries(ambiente)) {
    process.env[chave] = valor;
  }
  if (!('SWAGGER_ENABLED' in ambiente)) {
    delete process.env.SWAGGER_ENABLED;
  }

  const contexto = await criarAppDeTeste();

  try {
    await teste(contexto);
  } finally {
    await contexto.encerrar();
    for (const [chave, valor] of Object.entries(anterior)) {
      if (valor === undefined) {
        delete process.env[chave];
      } else {
        process.env[chave] = valor;
      }
    }
  }
}

describe('Documento OpenAPI — setup (e2e)', () => {
  it('serve o documento OpenAPI 3 sem sessão, com o cookie de sessão como esquema de segurança', async () => {
    await comAmbiente({ NODE_ENV: 'test' }, async (contexto) => {
      const resposta = await request(servidorHttp(contexto)).get(
        '/docs/openapi.json',
      );

      expect(resposta.status).toBe(200);
      expect(
        (resposta.body as { openapi: string }).openapi.startsWith('3.'),
      ).toBe(true);
      expect(
        (
          resposta.body as {
            components: { securitySchemes: Record<string, unknown> };
          }
        ).components.securitySchemes,
      ).toEqual({
        cookie: {
          type: 'apiKey',
          in: 'cookie',
          name: NOME_COOKIE_SESSAO,
        },
      });
    });
  });

  it('serve a Swagger UI em /docs como HTML', async () => {
    await comAmbiente({ NODE_ENV: 'test' }, async (contexto) => {
      const resposta = await request(servidorHttp(contexto)).get('/docs');

      expect(resposta.status).toBe(200);
      expect(resposta.headers['content-type']).toMatch(/text\/html/);
    });
  });

  it('responde 404 nas duas rotas em produção sem SWAGGER_ENABLED', async () => {
    await comAmbiente({ NODE_ENV: 'production' }, async (contexto) => {
      const servidor = servidorHttp(contexto);

      expect((await request(servidor).get('/docs')).status).toBe(404);
      expect((await request(servidor).get('/docs/openapi.json')).status).toBe(
        404,
      );
    });
  });

  it('serve as duas rotas em produção com SWAGGER_ENABLED=true', async () => {
    await comAmbiente(
      { NODE_ENV: 'production', SWAGGER_ENABLED: 'true' },
      async (contexto) => {
        const servidor = servidorHttp(contexto);

        expect((await request(servidor).get('/docs')).status).toBe(200);
        expect((await request(servidor).get('/docs/openapi.json')).status).toBe(
          200,
        );
      },
    );
  });
});
