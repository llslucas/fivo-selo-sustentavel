// Testes de unidade da formatação da campanha
// (web/src/lib/campanhas/formatacao.ts), com os textos exatos de VIT-03 AC6 e AC7.

import { describe, it, expect } from "vitest";

import { rotuloDoStatus, textoDoValor } from "@/lib/campanhas/formatacao";

describe("textoDoValor", () => {
  it("escreve a regra POR_UNIDADE em reais, no formato pt-BR", () => {
    expect(textoDoValor({ tipo: "POR_UNIDADE", valor: "1.00" })).toBe(
      "R$ 1,00 por unidade vendida",
    );
  });

  it("escreve a regra PERCENTUAL sem zeros sobrando", () => {
    expect(textoDoValor({ tipo: "PERCENTUAL", percentual: "2.50" })).toBe("2,5% de cada venda");
  });

  it("avisa quando a regra ainda não foi definida", () => {
    expect(textoDoValor(null)).toBe("Regra de doação não definida");
  });

  it.each([
    [{ tipo: "POR_UNIDADE", valor: "0.50" } as const, "R$ 0,50 por unidade vendida"],
    [{ tipo: "POR_UNIDADE", valor: "1234.50" } as const, "R$ 1.234,50 por unidade vendida"],
    [{ tipo: "PERCENTUAL", percentual: "10.00" } as const, "10% de cada venda"],
    [{ tipo: "PERCENTUAL", percentual: "0.25" } as const, "0,25% de cada venda"],
  ])("formata %o como %s", (regra, texto) => {
    expect(textoDoValor(regra)).toBe(texto);
  });
});

describe("rotuloDoStatus", () => {
  it.each([
    ["RASCUNHO", "Rascunho"],
    ["EM_ANALISE", "Em análise"],
    ["APROVADA", "Aprovada"],
    ["REJEITADA", "Rejeitada"],
  ] as const)("%s vira %s", (status, rotulo) => {
    expect(rotuloDoStatus(status)).toBe(rotulo);
  });
});
