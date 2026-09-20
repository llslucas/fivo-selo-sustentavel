import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { NOME_COOKIE_SESSAO } from '@infra/auth/auth.constants';

const CAMINHO_DOCS = 'docs';

function versaoDaApi(): string {
  try {
    const pacote = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };

    return pacote.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function montarDocumentoOpenApi(app: INestApplication): OpenAPIObject {
  const configuracao = new DocumentBuilder()
    .setTitle('Fivo — Selo Isso Importa')
    .setDescription('API de cadastro e autenticação de empresas')
    .setVersion(versaoDaApi())
    .addCookieAuth(NOME_COOKIE_SESSAO)
    .build();

  return SwaggerModule.createDocument(app, configuracao);
}

function swaggerHabilitado(): boolean {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true'
  );
}

export function configurarApp(app: INestApplication): void {
  app.use(cookieParser());

  if (swaggerHabilitado()) {
    SwaggerModule.setup(CAMINHO_DOCS, app, montarDocumentoOpenApi(app), {
      jsonDocumentUrl: `${CAMINHO_DOCS}/openapi.json`,
    });
  }
}
