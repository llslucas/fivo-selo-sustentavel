// Testes de unidade das validações de arquivo do cadastro de instituição
// (web/src/lib/arquivos.ts).

import { describe, it, expect, vi, afterEach } from "vitest";

import { validarDocumento, validarLogo } from "@/lib/arquivos";

const MB = 1024 * 1024;

function arquivo(tipo: string, tamanho = 1024, nome = "arquivo"): File {
  return new File([new Uint8Array(tamanho)], nome, { type: tipo });
}

// jsdom não decodifica imagens: simulamos o carregamento com as dimensões
// desejadas.
function simularImagem(largura: number, altura: number) {
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = largura;
      naturalHeight = altura;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_valor: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validarDocumento", () => {
  it.each(["application/pdf", "image/jpeg", "image/png"])("aceita %s", (tipo) => {
    expect(validarDocumento(arquivo(tipo))).toBeNull();
  });

  it("recusa tipo não permitido", () => {
    expect(validarDocumento(arquivo("text/plain"))).toBe("O documento deve ser um PDF, JPG ou PNG.");
  });

  it("aceita exatamente 10 MB e recusa acima disso", () => {
    expect(validarDocumento(arquivo("application/pdf", 10 * MB))).toBeNull();
    expect(validarDocumento(arquivo("application/pdf", 10 * MB + 1))).toBe(
      "O documento deve ter no máximo 10 MB.",
    );
  });
});

describe("validarLogo", () => {
  it("recusa tipo não permitido", async () => {
    expect(await validarLogo(arquivo("application/pdf"))).toBe("A logo deve ser um PNG, JPG ou SVG.");
  });

  it("recusa arquivo acima de 5 MB", async () => {
    expect(await validarLogo(arquivo("image/svg+xml", 5 * MB + 1))).toBe(
      "A logo deve ter no máximo 5 MB.",
    );
  });

  it("aceita SVG sem checar dimensões", async () => {
    expect(await validarLogo(arquivo("image/svg+xml"))).toBeNull();
  });

  it("aceita PNG com 512×512", async () => {
    simularImagem(512, 512);
    expect(await validarLogo(arquivo("image/png"))).toBeNull();
  });

  it("recusa PNG ou JPG menor que 512×512", async () => {
    simularImagem(511, 600);
    expect(await validarLogo(arquivo("image/jpeg"))).toBe(
      "A logo deve ter pelo menos 512×512 pixels.",
    );
  });
});