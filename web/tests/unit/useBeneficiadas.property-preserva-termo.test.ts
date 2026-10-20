// Teste de propriedade do hook useBeneficiadas
// (web/src/components/campaign-wizard/hooks/useBeneficiadas.ts).
//
// Cobre a Property 8 do design (catalogo-instituicoes-wizard): a preservação do
// termo de busca sob falha. O `request` real (services/api.ts) é exercitado
// contra o Mock_API (instalarMockFetch), nunca contra rede de verdade, e a
// requisição é forçada a falhar. Afirma-se que o termo exposto pelo hook
// (`termoBusca`) permanece igual ao digitado após a falha.
//
// Usa fake timers para avançar o debounce de 300 ms e renderHook do
// @testing-library/react para montar o hook isoladamente.

import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import fc from "fast-check";

import { useBeneficiadas } from "@/components/campaign-wizard/hooks/useBeneficiadas";
import { instalarMockFetch } from "../helpers/mockFetch";

// Debounce aplicado pelo hook antes de disparar a busca (Requisito 3.3).
const DEBOUNCE_MS = 300;

afterEach(() => {
  // Garante que os timers reais voltem entre execuções/iterações.
  vi.useRealTimers();
});

describe("useBeneficiadas — preservação do termo de busca sob falha", () => {
  // Feature: catalogo-instituicoes-wizard, Property 8: Preservação do termo de busca sob falha
  // Validates: Requirements 3.7
  it("Property 8: Preservação do termo de busca sob falha", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (termo) => {
        vi.useFakeTimers();
        const mock = instalarMockFetch();
        // Toda requisição a /beneficiadas falha por rede, exercitando o caminho
        // de erro do hook (ApiError(0, ...)).
        mock.falharPorRede();

        try {
          const { result } = renderHook(() => useBeneficiadas());

          // Deixa a busca inicial (montagem) resolver para o estado de erro.
          await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
          });

          // Empresa digita o termo; `termoBusca` reflete imediatamente.
          act(() => {
            result.current.definirTermoBusca(termo);
          });

          // Avança o debounce para disparar a busca do termo digitado, que
          // também falha.
          await act(async () => {
            await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
          });

          // Sob falha, o termo digitado é preservado inalterado (Requisito 3.7).
          expect(
            result.current.termoBusca,
            `Esperado termoBusca preservado como "${termo}" após falha, ` +
              `recebido "${result.current.termoBusca}".`,
          ).toBe(termo);
          expect(
            result.current.estado,
            "Esperado estado de erro após a falha da requisição.",
          ).toBe("erro");
        } finally {
          cleanup();
          mock.restaurar();
          vi.useRealTimers();
        }
      }),
      { numRuns: 100 },
    );
  });
});
