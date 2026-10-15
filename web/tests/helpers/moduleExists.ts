// Detecção condicional de serviços opcionais (Requisito 7).
//
// Alguns serviços do frontend ainda não existem (dependem de tasks futuras):
// `instituicoes.ts`, `campanhas.ts`, `selos.ts`, `comprovantes.ts`. Os blocos
// de teste correspondentes usam `describe.skipIf(!servicoExiste("..."))` para
// serem pulados enquanto o módulo não existe, sem quebrar a suíte. Quando o
// arquivo passar a existir, os testes passam a rodar automaticamente.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Diretório deste helper: web/tests/helpers/. Resolvemos o caminho dos serviços
// relativo a ele (independente do CWD de onde o runner é invocado), garantindo
// que a detecção funcione mesmo quando o Vitest roda a partir de web/.
const DIRETORIO_ESTE_ARQUIVO = dirname(fileURLToPath(import.meta.url));

// web/tests/helpers/ -> ../../src/services -> web/src/services
const DIRETORIO_SERVICOS = resolve(
  DIRETORIO_ESTE_ARQUIVO,
  "..",
  "..",
  "src",
  "services",
);

// Normaliza o nome do arquivo para o import via alias "@/services/<nome>".
// Importações ESM/TS não usam a extensão ".ts", então ela é removida quando
// presente para formar o especificador do import dinâmico.
function nomeModulo(nomeArquivo: string): string {
  return nomeArquivo.replace(/\.ts$/, "");
}

/**
 * Resolve o caminho do módulo relativo a `web/src/services` e retorna `true`
 * se o arquivo existir no disco.
 *
 * @param nomeArquivo nome do arquivo do serviço (ex.: "instituicoes.ts").
 */
export function servicoExiste(nomeArquivo: string): boolean {
  const nome = nomeModulo(nomeArquivo);
  return existsSync(resolve(DIRETORIO_SERVICOS, `${nome}.ts`));
}

/**
 * Importa dinamicamente o módulo de serviço apenas quando ele existe.
 * Retorna o módulo quando presente ou `null` quando ausente, evitando que um
 * import de módulo inexistente quebre a execução.
 *
 * @param nomeArquivo nome do arquivo do serviço (ex.: "instituicoes.ts").
 */
export async function importarSeExistir<T>(
  nomeArquivo: string,
): Promise<T | null> {
  if (!servicoExiste(nomeArquivo)) {
    return null;
  }

  const nome = nomeModulo(nomeArquivo);
  // Usa o alias "@/services/*" configurado em vitest.config.ts/tsconfig.
  // `@vite-ignore` evita que o bundler tente resolver estaticamente o
  // especificador dinâmico (o alvo pode não existir em tempo de análise).
  const modulo = (await import(/* @vite-ignore */ `@/services/${nome}`)) as T;
  return modulo;
}
