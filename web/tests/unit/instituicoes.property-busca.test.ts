// Teste de propriedade do Catalogo_Beneficiadas (web/src/services/instituicoes.ts).
//
// Cobre a Property 4 do design (catalogo-instituicoes-wizard): a regra de busca
// por comprimento do termo. O `request` real (services/api.ts) é exercitado
// contra o Mock_API (instalarMockFetch), nunca contra rede de verdade; a URL
// efetivamente passada ao fetch mockado é inspecionada para afirmar a
// presença/ausência de valor no parâmetro `busca`.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { listarBeneficiadas } from "@/services/instituicoes";
import { instalarMockFetch } from "../helpers/mockFetch";

// Extrai o valor do parâmetro `busca` da query string de uma URL capturada.
// Retorna `null` quando o parâmetro não está presente (sem valor de filtro).
function valorBuscaDaUrl(url: string): string | null {
  const indice = url.indexOf("?");
  if (indice === -1) {
    return null;
  }
  const params = new URLSearchParams(url.slice(indice + 1));
  return params.get("busca");
}

describe("Catalogo_Beneficiadas (instituicoes.ts) — regra de busca", () => {
  // Feature: catalogo-instituicoes-wizard, Property 4: Regra de busca por comprimento do termo
  // Validates: Requirements 3.1, 3.2
  it("Property 4: Regra de busca por comprimento do termo", () => {
    fc.assert(
      fc.asyncProperty(fc.string(), async (termo) => {
        const mock = instalarMockFetch();
        // Catálogo vazio basta: só interessa inspecionar a URL requisitada.
        mock.responderCom({ status: 200, body: [] });

        await listarBeneficiadas(termo);

        const url = mock.ultimaChamada().url;
        const termoTrim = termo.trim();
        const deveFiltrar = termoTrim.length >= 2;
        const buscaNaUrl = valorBuscaDaUrl(url);

        if (deveFiltrar) {
          // Termo com 2+ caracteres (após trim): `busca=<termo>` presente, com o
          // valor decodificado igual ao termo trimado.
          expect(
            buscaNaUrl,
            `Esperado parâmetro busca="${termoTrim}" para termo com 2+ caracteres, ` +
              `recebido URL "${url}".`,
          ).toBe(termoTrim);
        } else {
          // Termo com menos de 2 caracteres (ou vazio): nenhum valor de filtro
          // no parâmetro `busca`.
          expect(
            buscaNaUrl,
            `Esperado nenhum valor de filtro em busca para termo "${termo}" ` +
              `(< 2 caracteres após trim), recebido URL "${url}".`,
          ).toBeNull();
        }

        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });
});
