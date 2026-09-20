import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { montarDocumentoOpenApi } from '@infra/http/configurar-app';
import { serializarOpenApi } from '@infra/http/openapi/serializar-openapi';
import { AppDeTeste, criarAppDeTeste } from '@test/helpers/e2e-app';

describe('openapi.json versionado (e2e)', () => {
  let contexto: AppDeTeste;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('é igual ao documento gerado pela aplicação', () => {
    const versionado = readFileSync(
      join(process.cwd(), 'openapi.json'),
      'utf8',
    );
    const gerado = serializarOpenApi(montarDocumentoOpenApi(contexto.app));

    if (versionado !== gerado) {
      throw new Error(
        'openapi.json desatualizado: rode `npm run openapi:export` e commite o arquivo',
      );
    }

    expect(versionado).toBe(gerado);
  });
});
