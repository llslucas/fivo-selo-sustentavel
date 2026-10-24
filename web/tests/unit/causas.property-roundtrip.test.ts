// Feature: seletor-causa-cadastro-instituicao, Property 7: Round-trip de desserialização do serviço
//
// Teste de propriedade do Servico_De_Causas (web/src/services/causas.ts).
//
// Cobre a Property 7 do design: o que `GET /causas` entrega no corpo é o que
// `listarCausas()` resolve, sem reordenar, filtrar ou transformar (round-trip).
// O `request` real (services/api.ts) é exercitado contra o Mock_API
// (instalarMockFetch), nunca contra rede de verdade. Complementamos com os
// casos de borda: lista vazia resolve `[]`; falha de servidor (500) e falha de
// rede rejeitam com `ApiError` em vez de resolver (Requisitos 7.4, 7.5).

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { listarCausas, type Causa } from "@/services/causas";
import { ApiError } from "@/services/api";
import { instalarMockFetch } from "../helpers/mockFetch";

// Gerador de uma Causa dentro dos limites do contrato público (Requisito 7.2):
// `id` 1..36, `nome` 1..120, `descricao` 0..500.
const arbCausa: fc.Arbitrary<Causa> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }),
  nome: fc.string({ minLength: 1, maxLength: 120 }),
  descricao: fc.string({ minLength: 0, maxLength: 500 }),
});

// Lista de 0..N causas (0..500 conforme Requisito 7.4; limitamos o teto por
// desempenho, mantendo o caso de lista vazia dentro do espaço gerado).
const arbListaCausas: fc.Arbitrary<Causa[]> = fc.array(arbCausa, {
  minLength: 0,
  maxLength: 30,
});

describe("Servico_De_Causas (causas.ts) — round-trip de desserialização", () => {
  // Validates: Requirements 7.4, 7.5
  it("Property 7: Round-trip de desserialização do serviço", async () => {
    await fc.assert(
      fc.asyncProperty(arbListaCausas, async (lista) => {
        const mock = instalarMockFetch();
        mock.responderPara("/causas", { status: 200, body: lista });

        const resolvida = await listarCausas();

        // Igualdade estrita com o corpo: mesma quantidade, mesma ordem e mesmos
        // atributos de cada Causa (sem reordenar, filtrar ou transformar).
        expect(resolvida).toEqual(lista);

        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });

  // Exemplo: lista vazia resolve `[]` (Requisito 7.4 — retorna lista vazia
  // quando não há nenhuma Causa, em vez de rejeitar).
  it("resolve uma lista vazia quando o corpo é []", async () => {
    const mock = instalarMockFetch();
    mock.responderPara("/causas", { status: 200, body: [] });

    const resolvida = await listarCausas();

    expect(resolvida).toEqual([]);

    mock.restaurar();
  });

  // Exemplo: falha de servidor (500) rejeita com ApiError (Requisito 7.5 —
  // sinaliza erro em vez de retornar uma lista).
  it("rejeita com ApiError quando a API responde 500", async () => {
    const mock = instalarMockFetch();
    mock.responderPara("/causas", {
      status: 500,
      body: { statusCode: 500, message: "Internal server error" },
    });

    await expect(listarCausas()).rejects.toBeInstanceOf(ApiError);
    await expect(listarCausas()).rejects.toMatchObject({ status: 500 });

    mock.restaurar();
  });

  // Exemplo: falha de rede rejeita com ApiError(0) (Requisito 7.5).
  it("rejeita com ApiError quando há falha de rede", async () => {
    const mock = instalarMockFetch();
    mock.falharPorRede();

    await expect(listarCausas()).rejects.toBeInstanceOf(ApiError);
    await expect(listarCausas()).rejects.toMatchObject({ status: 0 });

    mock.restaurar();
  });
});
