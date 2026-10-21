// Teste de propriedade do hook useBeneficiadas
// (web/src/components/campaign-wizard/hooks/useBeneficiadas.ts).
//
// Cobre a Property 6 do design (catalogo-instituicoes-wizard): a ação de nova
// tentativa é condicionada ao tipo de erro. Para qualquer erro ocorrido na
// busca do catálogo, `podeTentarNovamente` exposto pelo hook deve ser verdadeiro
// se e somente se `ehErroRecuperavel` do Cliente_HTTP for verdadeiro para aquele
// erro. O `request` real (services/api.ts) é exercitado contra o Mock_API
// (instalarMockFetch), nunca contra rede de verdade.

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { renderHook, waitFor } from "@testing-library/react";

import { useBeneficiadas } from "@/components/campaign-wizard/hooks/useBeneficiadas";
import { ApiError, ehErroRecuperavel } from "@/services/api";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// Cada caso gerado descreve como a busca ao catálogo falhará e qual é o erro
// equivalente (o mesmo que o Cliente_HTTP produz) para comparar contra
// `ehErroRecuperavel`.
type CasoErro =
  | { tipo: "rede" } // falha de conexão => ApiError(0, ...)
  | { tipo: "status"; status: number }; // resposta HTTP não-ok => ApiError(status, ...)

// Gera erros variados: ora falha de rede (status 0), ora respostas HTTP de
// erro com status aleatório cobrindo 4xx, 5xx e faixas vizinhas.
const casoErroArb: fc.Arbitrary<CasoErro> = fc.oneof(
  fc.constant<CasoErro>({ tipo: "rede" }),
  fc
    .integer({ min: 400, max: 599 })
    .map((status) => ({ tipo: "status", status }) as CasoErro),
  // Alguns status específicos frequentes neste domínio (401/403/404/500/503).
  fc
    .constantFrom(401, 403, 404, 408, 429, 500, 502, 503)
    .map((status) => ({ tipo: "status", status }) as CasoErro),
);

// Erro equivalente ao que o Cliente_HTTP (services/api.ts) produziria para o
// caso gerado, usado como referência para `ehErroRecuperavel`.
function erroEquivalente(caso: CasoErro): ApiError {
  if (caso.tipo === "rede") {
    return new ApiError(
      0,
      "Não foi possível conectar com o servidor. Verifique sua conexão.",
    );
  }
  return new ApiError(caso.status, "Ocorreu um erro inesperado. Tente novamente.");
}

// Configura o Mock_API para reproduzir o caso de erro gerado.
function aplicarCaso(mock: MockFetch, caso: CasoErro): void {
  if (caso.tipo === "rede") {
    mock.falharPorRede();
  } else {
    mock.responderCom({ status: caso.status, body: { message: "" } });
  }
}

describe("useBeneficiadas — ação de nova tentativa condicionada ao erro", () => {
  // Feature: catalogo-instituicoes-wizard, Property 6: Ação de nova tentativa condicionada ao tipo de erro
  // Validates: Requirements 2.6, 4.8, 4.9
  it("Property 6: podeTentarNovamente é verdadeiro sse e somente se ehErroRecuperavel", async () => {
    await fc.assert(
      fc.asyncProperty(casoErroArb, async (caso) => {
        const mock = instalarMockFetch();
        try {
          aplicarCaso(mock, caso);

          // A busca inicial (catálogo completo) dispara na montagem e falha
          // conforme o caso gerado, levando o hook ao estado de erro.
          const { result, unmount } = renderHook(() => useBeneficiadas());

          await waitFor(() => {
            expect(result.current.estado).toBe("erro");
          });

          const esperado = ehErroRecuperavel(erroEquivalente(caso));

          expect(
            result.current.podeTentarNovamente,
            `Para o caso ${JSON.stringify(caso)}, esperado ` +
              `podeTentarNovamente=${esperado} (igual a ehErroRecuperavel), ` +
              `recebido ${result.current.podeTentarNovamente}.`,
          ).toBe(esperado);

          unmount();
        } finally {
          mock.restaurar();
        }
      }),
      { numRuns: 100 },
    );
  }, 30_000);
});
