import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carrega o `.env` do `api/` em `process.env` antes de qualquer suite e2e.
 * O Prisma Client (diferente do CLI) não lê `.env` sozinho, e o `PrismaService`
 * é instanciado pelo Nest já no boot da app de teste.
 *
 * Valor padrão: o Postgres descartável de `docker-compose.test.yml`.
 */
const DATABASE_URL_PADRAO =
  'postgresql://fivo:fivo@localhost:5433/fivo_test?schema=public';

function carregarArquivoEnv(caminho: string): void {
  if (!existsSync(caminho)) {
    return;
  }

  for (const linha of readFileSync(caminho, 'utf-8').split('\n')) {
    const conteudo = linha.trim();

    if (!conteudo || conteudo.startsWith('#')) {
      continue;
    }

    const separador = conteudo.indexOf('=');

    if (separador === -1) {
      continue;
    }

    const chave = conteudo.slice(0, separador).trim();
    const valor = conteudo
      .slice(separador + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    if (process.env[chave] === undefined) {
      process.env[chave] = valor;
    }
  }
}

carregarArquivoEnv(resolve(__dirname, '..', '..', '.env'));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DATABASE_URL_PADRAO;
}
