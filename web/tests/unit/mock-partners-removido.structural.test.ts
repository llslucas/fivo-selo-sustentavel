// T40/T60 (vitrine-e-selo, VIT-09): a vitrine usa a API, então o detalhe
// fictício `/parceiros/[id]` e `mockPartners` saem do projeto. Teste
// estrutural: lê o código-fonte em disco, sem montar componentes.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

function arquivosFonte(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) return arquivosFonte(caminho);
    return /\.(ts|tsx)$/.test(entrada.name) ? [caminho] : [];
  });
}

function semComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n\r]*/g, "");
}

describe("remoção estrutural de mockPartners e /parceiros/[id]", () => {
  it("não mantém web/src/lib/mockPartners.ts", () => {
    expect(existsSync(join(SRC, "lib", "mockPartners.ts"))).toBe(false);
  });

  it("não mantém a rota web/src/app/parceiros/[id]", () => {
    expect(existsSync(join(SRC, "app", "parceiros", "[id]"))).toBe(false);
  });

  it("nenhum arquivo de web/src importa mockPartners", () => {
    const arquivos = arquivosFonte(SRC);
    expect(arquivos.length).toBeGreaterThan(0);

    const ofensores = arquivos
      .filter((caminho) =>
        /from\s+["'][^"']*mockPartners["']|\bmockPartnerCompanies\b/.test(
          semComentarios(readFileSync(caminho, "utf8")),
        ),
      )
      .map((caminho) => relative(SRC, caminho));

    expect(ofensores).toEqual([]);
  });

  it("nenhum link aponta para /parceiros/{id}", () => {
    const ofensores = arquivosFonte(SRC)
      .filter((caminho) =>
        /["'`]\/parceiros\/(\$\{|[\w-])/.test(
          semComentarios(readFileSync(caminho, "utf8")),
        ),
      )
      .map((caminho) => relative(SRC, caminho));

    expect(ofensores).toEqual([]);
  });
});
