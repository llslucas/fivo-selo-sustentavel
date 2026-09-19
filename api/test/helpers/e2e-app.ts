import type { Server } from 'node:http';

import { INestApplication, ModuleMetadata, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Test as RequisicaoSupertest } from 'supertest';

import { AppModule } from '@infra/app.module';
import { NOME_COOKIE_SESSAO } from '@infra/auth/auth.constants';
import { configurarApp } from '@infra/http/configurar-app';
import { PrismaService } from '@infra/database/prisma/prisma.service';

export interface AppDeTeste {
  app: INestApplication;
  prisma: PrismaService;
  encerrar(): Promise<void>;
}

/**
 * Sobe uma app Nest completa apontando para a `DATABASE_URL` de teste
 * (carregada por `test/helpers/load-env.ts`, registrado em `setupFiles`).
 */
export async function criarAppDeTeste(
  opcoes: {
    controllers?: Type<unknown>[];
    imports?: ModuleMetadata['imports'];
  } = {},
): Promise<AppDeTeste> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...(opcoes.imports ?? [])],
    controllers: opcoes.controllers ?? [],
  }).compile();

  const app = moduleRef.createNestApplication();
  configurarApp(app);
  const prisma = app.get(PrismaService);

  await app.init();

  return {
    app,
    prisma,
    encerrar: async () => {
      await app.close();
    },
  };
}

/**
 * Tabelas em ordem de dependência (dependentes primeiro). O `CASCADE` do
 * Postgres cobre qualquer FK remanescente, então a limpeza nunca falha por
 * ordem — a ordem explícita só documenta o grafo.
 */
const TABELAS_EM_ORDEM_DE_FK = [
  'sessao',
  'token_senha',
  'registro_auditoria',
  'empresa',
  'usuario',
  'arquivo',
] as const;

/** Trunca todas as tabelas. Chamável em `beforeEach`. */
export async function limparBanco(prisma: PrismaService): Promise<void> {
  const tabelas = TABELAS_EM_ORDEM_DE_FK.map((tabela) => `"${tabela}"`).join(
    ', ',
  );

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tabelas} RESTART IDENTITY CASCADE`,
  );
}

/** Servidor HTTP tipado da app de teste, para passar ao supertest. */
export function servidorHttp(contexto: AppDeTeste): Server {
  return contexto.app.getHttpServer() as Server;
}

export { NOME_COOKIE_SESSAO };

/** Injeta o cookie de sessão opaca (AD-012) em uma request supertest. */
export function comCookieDeSessao(
  requisicao: RequisicaoSupertest,
  token: string,
): RequisicaoSupertest {
  return requisicao.set('Cookie', `${NOME_COOKIE_SESSAO}=${token}`);
}
