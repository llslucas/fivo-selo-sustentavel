// Verificação estrutural da remoção dos dados simulados de beneficiadas
// (Requisitos 7.4, 7.5, 7.6).
//
// Este teste é puramente estrutural: ele não monta componentes nem exercita a
// rede. Em vez disso, inspeciona o código-fonte do frontend no disco para
// garantir, de forma duradoura, que o mock foi realmente removido e que nenhum
// módulo volta a referenciá-lo.
//
// Afirmações:
//   1. O arquivo `web/src/lib/campaign-wizard/mock-data.ts` NÃO existe mais
//      (Requisito 7.6).
//   2. Nenhum arquivo-fonte sob `web/src` IMPORTA `instituicoesMock` nem
//      importa do módulo `.../campaign-wizard/mock-data` (Requisitos 7.4, 7.5,
//      7.6).
//
// A verificação de referências é robusta a comentários: antes de procurar por
// um import/identificador real, cada arquivo tem seus comentários de linha
// (`// ...`) e de bloco (`/* ... */`) removidos. Assim, uma menção incidental a
// `instituicoesMock` dentro de um comentário descritivo NÃO faz o teste falhar;
// só um import ou referência de verdade no código é considerado.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";

import { describe, it, expect } from "vitest";

// Diretório deste arquivo: web/tests/unit/. Resolvemos os caminhos relativos a
// ele (independente do CWD do runner), garantindo que a varredura funcione
// mesmo quando o Vitest roda a partir de web/.
const DIRETORIO_ESTE_ARQUIVO = dirname(fileURLToPath(import.meta.url));

// web/tests/unit/ -> ../../src -> web/src
const DIRETORIO_SRC = resolve(DIRETORIO_ESTE_ARQUIVO, "..", "..", "src");

// web/src/lib/campaign-wizard/mock-data.ts
const ARQUIVO_MOCK = resolve(
  DIRETORIO_SRC,
  "lib",
  "campaign-wizard",
  "mock-data.ts",
);

// Remove comentários de linha (`// ...`) e de bloco (`/* ... */`) do conteúdo,
// de modo que a busca por referências reais ignore menções incidentais dentro
// de comentários. Implementação simples e suficiente para código-fonte do
// projeto: não precisa modelar strings exatamente, pois só nos interessa a
// ausência do identificador fora de comentários.
function removerComentarios(conteudo: string): string {
  return conteudo
    // Comentários de bloco /* ... */ (incluindo multi-linha).
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Comentários de linha // ... até o fim da linha.
    .replace(/\/\/[^\n\r]*/g, "");
}

// Coleta recursivamente todos os arquivos .ts/.tsx sob um diretório.
function coletarArquivosFonte(diretorio: string): string[] {
  const resultado: string[] = [];
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      resultado.push(...coletarArquivosFonte(caminho));
    } else if (/\.(ts|tsx)$/.test(entrada.name)) {
      resultado.push(caminho);
    }
  }
  return resultado;
}

// Expressões que caracterizam uma referência REAL ao mock (após a remoção de
// comentários):
//   - o identificador `instituicoesMock` como palavra (import/uso);
//   - um import cujo especificador termine em `campaign-wizard/mock-data`.
const REFERENCIA_IDENTIFICADOR = /\binstituicoesMock\b/;
const IMPORT_MODULO_MOCK =
  /from\s+["'][^"']*campaign-wizard\/mock-data["']/;

describe("remoção estrutural dos dados simulados (instituicoesMock)", () => {
  it("não mantém o arquivo web/src/lib/campaign-wizard/mock-data.ts", () => {
    // Requisito 7.6: o módulo de mock deve ter sido removido do disco.
    expect(
      existsSync(ARQUIVO_MOCK),
      `O arquivo ${relative(DIRETORIO_SRC, ARQUIVO_MOCK)} ainda existe; ` +
        "ele deveria ter sido removido junto com a exportação `instituicoesMock`.",
    ).toBe(false);
  });

  it("nenhum módulo sob web/src importa ou referencia instituicoesMock", () => {
    const arquivos = coletarArquivosFonte(DIRETORIO_SRC);

    // Sanidade: a varredura precisa de fato encontrar arquivos-fonte; caso
    // contrário o teste seria vacuamente verdadeiro e esconderia regressões.
    expect(
      arquivos.length,
      "Nenhum arquivo .ts/.tsx encontrado em web/src; a varredura estrutural " +
        "não teria efeito. Verifique a resolução de DIRETORIO_SRC.",
    ).toBeGreaterThan(0);

    const ofensores: string[] = [];
    for (const caminho of arquivos) {
      const codigoSemComentarios = removerComentarios(readFileSync(caminho, "utf8"));
      if (
        REFERENCIA_IDENTIFICADOR.test(codigoSemComentarios) ||
        IMPORT_MODULO_MOCK.test(codigoSemComentarios)
      ) {
        ofensores.push(relative(DIRETORIO_SRC, caminho));
      }
    }

    // Requisitos 7.4, 7.5, 7.6: nenhum módulo do projeto pode manter importação
    // ou referência a `instituicoesMock` (fora de comentários).
    expect(
      ofensores,
      "Os seguintes módulos ainda importam/referenciam `instituicoesMock` " +
        `(ou o módulo campaign-wizard/mock-data): ${ofensores.join(", ")}`,
    ).toEqual([]);
  });
});
