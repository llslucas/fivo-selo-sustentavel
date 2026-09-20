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

interface Operacao {
  security?: Record<string, string[]>[];
  responses: Record<string, Record<string, unknown>>;
  requestBody?: {
    content: Record<string, { schema: Record<string, unknown> }>;
  };
}
interface Documento {
  paths: Record<string, Record<string, Operacao>>;
  components: {
    schemas: Record<
      string,
      {
        required?: string[];
        properties: Record<string, Record<string, unknown>>;
      }
    >;
  };
}

async function lerDocumento(): Promise<Documento> {
  let documento: Documento | undefined;

  await comAmbiente({ NODE_ENV: 'test' }, async (contexto) => {
    const resposta = await request(servidorHttp(contexto)).get(
      '/docs/openapi.json',
    );
    documento = resposta.body as Documento;
  });

  return documento as Documento;
}

describe('Documento OpenAPI — CadastroEmpresaController (e2e)', () => {
  let documento: Documento;

  beforeAll(async () => {
    documento = await lerDocumento();
  });

  it('documenta as 5 operações com os status esperados', () => {
    const status = (caminho: string, metodo: string) =>
      Object.keys(documento.paths[caminho][metodo].responses).sort();

    expect(status('/empresas', 'post')).toEqual(['201', '409', '422', '503']);
    expect(status('/empresas/me', 'get')).toEqual(['200', '401', '403', '404']);
    expect(status('/empresas/me', 'patch')).toEqual([
      '200',
      '401',
      '403',
      '404',
      '422',
      '503',
    ]);
    expect(status('/empresas/me/email', 'patch')).toEqual([
      '202',
      '401',
      '403',
      '404',
      '422',
    ]);
    expect(status('/empresas/me/email/confirmacao', 'post')).toEqual([
      '204',
      '400',
      '409',
      '422',
    ]);
  });

  it('POST /empresas é multipart com logo binário e os required do Zod', () => {
    const corpo = documento.paths['/empresas'].post.requestBody;
    const ref = corpo?.content['multipart/form-data'].schema.$ref as string;
    const esquema = documento.components.schemas[ref.split('/').pop() ?? ''];

    expect(esquema.properties.logo).toEqual({
      type: 'string',
      format: 'binary',
    });
    expect(esquema.required).toEqual(
      expect.arrayContaining(['razaoSocial', 'cnpj', 'email', 'senha', 'uf']),
    );
    expect(esquema.required).not.toContain('logo');
  });

  it('GET /empresas/me exige o cookie de sessão; POST /empresas é público', () => {
    expect(documento.paths['/empresas/me'].get.security).toEqual([
      { cookie: [] },
    ]);
    expect(documento.paths['/empresas'].post.security).toBeUndefined();
  });
});

describe('Documento OpenAPI — AutenticacaoController (e2e)', () => {
  let documento: Documento;

  beforeAll(async () => {
    documento = await lerDocumento();
  });

  it('documenta login (200 com Set-Cookie, 401, 422, 429, público) e logout (204, 401, protegido)', () => {
    const login = documento.paths['/sessoes'].post;
    const logout = documento.paths['/sessoes/atual'].delete;

    expect(Object.keys(login.responses).sort()).toEqual([
      '200',
      '401',
      '422',
      '429',
    ]);
    expect(Object.keys(login.responses['200'].headers as object)).toContain(
      'Set-Cookie',
    );
    expect(login.security).toBeUndefined();
    expect(Object.keys(logout.responses).sort()).toEqual(['204', '401']);
    expect(logout.security).toEqual([{ cookie: [] }]);
  });
});
