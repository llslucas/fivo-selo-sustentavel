// Teste de contrato/assinatura do Servico_De_Causas (web/src/services/causas.ts).
//
// Objetivo (Requisitos 7.1, 7.2, 7.3): garantir que a interface pública do
// módulo de causas permaneça estável, de modo que a F9 — que também consome
// `listarCausas()` e o tipo `Causa` — continue funcionando mesmo após as
// mudanças desta funcionalidade (F2).
//
// Este teste combina duas camadas de verificação:
//   1. Compile-time: asserções de tipo (via `expectTypeOf`) confirmam que
//      `listarCausas()` retorna `Promise<Causa[]>` e que o tipo `Causa` possui
//      exatamente os atributos `id`, `nome` e `descricao`, todos `string`.
//      Qualquer quebra de compatibilidade (renomear/remover atributo, trocar o
//      tipo de retorno) falha na checagem de tipos (typecheck/build).
//   2. Runtime: usando o Mock_API (instalarMockFetch/responderPara), afirma que
//      `listarCausas()` resolve com uma lista de objetos cujo formato casa com
//      o contrato, exercitando a desserialização real do cliente HTTP.
//
// As respostas vêm de fixtures inline controladas pelo Mock_API; nenhuma rede
// real é usada. O afterEach global (vi.unstubAllGlobals) restaura o fetch, mas
// chamamos `restaurar()` explicitamente para isolar as chamadas capturadas.

import { describe, it, expect, expectTypeOf, afterEach } from "vitest";

import { listarCausas, type Causa } from "@/services/causas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

let mock: MockFetch;

afterEach(() => {
  mock?.restaurar();
});

describe("Servico_De_Causas — contrato/assinatura (compatibilidade F9)", () => {
  // Requisito 7.1: `listarCausas()` retorna `Promise<Causa[]>`.
  it("expõe listarCausas() com retorno Promise<Causa[]> (tipo)", () => {
    expectTypeOf(listarCausas).toBeFunction();
    expectTypeOf(listarCausas).parameters.toEqualTypeOf<[]>();
    expectTypeOf(listarCausas).returns.toEqualTypeOf<Promise<Causa[]>>();
  });

  // Requisitos 7.2, 7.3: o tipo `Causa` tem exatamente os atributos
  // `id`, `nome` e `descricao`, todos string (nomes, quantidade e tipos).
  it("expõe o tipo Causa com atributos id, nome e descricao (string)", () => {
    expectTypeOf<Causa>().toEqualTypeOf<{
      id: string;
      nome: string;
      descricao: string;
    }>();

    expectTypeOf<keyof Causa>().toEqualTypeOf<"id" | "nome" | "descricao">();
    expectTypeOf<Causa["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Causa["nome"]>().toEqualTypeOf<string>();
    expectTypeOf<Causa["descricao"]>().toEqualTypeOf<string>();
  });

  // Runtime: listarCausas() resolve uma lista cujo formato honra o contrato,
  // chamando GET /causas por meio do cliente HTTP (prefixo "/api").
  it("resolve uma lista de Causa a partir de GET /causas", async () => {
    mock = instalarMockFetch();

    const corpo: Causa[] = [
      { id: "1", nome: "Educação", descricao: "Apoio à educação" },
      { id: "2", nome: "Saúde", descricao: "" },
    ];
    mock.responderPara("/causas", { status: 200, body: corpo });

    const resultado = await listarCausas();

    // Resolve um array com os mesmos itens do corpo (round-trip de forma).
    expect(Array.isArray(resultado)).toBe(true);
    expect(resultado).toEqual(corpo);

    // Cada item carrega exatamente os atributos do contrato, todos string.
    for (const causa of resultado) {
      expect(Object.keys(causa).sort()).toEqual(["descricao", "id", "nome"]);
      expect(typeof causa.id).toBe("string");
      expect(typeof causa.nome).toBe("string");
      expect(typeof causa.descricao).toBe("string");
    }

    // Uma única chamada GET para a rota pública /causas (prefixada com /api).
    const chamada = mock.ultimaChamada();
    expect(chamada.method).toBe("GET");
    expect(chamada.url.endsWith("/causas")).toBe(true);
    expect(chamada.url.startsWith("/api")).toBe(true);
  });
});
