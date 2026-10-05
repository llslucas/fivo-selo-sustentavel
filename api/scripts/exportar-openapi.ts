import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '@infra/app.module';
import { montarDocumentoOpenApi } from '@infra/http/configurar-app';
import { serializarOpenApi } from '@infra/http/openapi/serializar-openapi';

async function exportar(): Promise<void> {
  // Sem `init()`/`listen()`: só escaneia as rotas, sem abrir banco nem worker.
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    writeFileSync(
      join(process.cwd(), 'openapi.json'),
      serializarOpenApi(montarDocumentoOpenApi(app)),
    );
  } finally {
    await app.close();
  }
}

exportar().then(
  () => process.exit(0),
  (erro: unknown) => {
    console.error(erro);
    process.exit(1);
  },
);
