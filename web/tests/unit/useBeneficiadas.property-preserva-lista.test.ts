// Teste de propriedade do hook useBeneficiadas
// (web/src/components/campaign-wizard/hooks/useBeneficiadas.ts).
//
// Cobre a Property 7 do design (catalogo-instituicoes-wizard): preservação da
// lista anterior sob falha. Depois de uma primeira busca bem-sucedida que
// carrega uma lista não-vazia (estado "carregado"), uma busca subsequente cuja
// resposta falha deve manter `beneficiadas` exatamente igual à lista anterior,
// sem dados parciais nem fallback simulado — apenas transicionando para "erro".
//
// O `request` real (services/api.ts) é exercitado contra o Mock_API
// (instalarMockFetch), nunca contra rede de verdade. O debounce de 300 ms é
// avançado com fake timers; as respostas HTTP (promises) são drenadas entre os
// avanços de tempo.

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { renderHook, act } from "@testing-library/react";

import { instalarMockFetch } from "../helpers/mockFetch";
import {
  useBeneficiadas,
  type EstadoBeneficiadas,
} from "@/components/campaign-wizard/hooks/useBeneficiadas";
import type { Beneficiada } from "@/services/instituicoes";

const DEBOUNCE_MS = 300;

// Gera uma beneficiada válida (id e nome não-vazios => sobrevive ao filtro do
// serviço). Os demais campos variam livremente dentro do contrato.
const beneficiadaArb: fc.Arbitrary<Beneficiada> = fc.record({
  tipo: fc.constantFrom<Beneficiada["tipo"]>("INSTITUICAO", "CAUSA"),
  id: fc.string({ minLength: 1, maxLength: 12 }).filter((s) => s.trim().length > 0),
  nome: fc.string({ minLength: 1, maxLength: 24 }).filter((s) => s.trim().length > 0),
  causa: fc.option(fc.string({ maxLength: 16 }), { nil: null }),
  cidade: fc.option(fc.string({ maxLength: 16 }), { nil: null }),
  uf: fc.option(fc.string({ maxLength: 2 }), { nil: null }),
  descricao: fc.string({ maxLength: 40 }),
  site: fc.option(fc.webUrl(), { nil: null }),
  logoArquivoId: fc.option(fc.string({ maxLength: 12 }), { nil: null }),
});

// Lista inicial não-vazia, com ids únicos para asserção determinística de igualdade.
const listaCarregadaArb: fc.Arbitrary<Beneficiada[]> = fc
  .uniqueArray(beneficiadaArb, {
    minLength: 1,
    maxLength: 6,
    selector: (b) => b.id,
  });

// Termo de busca que dispara nova requisição (>= 2 caracteres após trim), para
// garantir que a segunda busca (a que falha) é efetivamente emitida.
const termoBuscaArb: fc.Arbitrary<string> = fc
  .string({ minLength: 2, maxLength: 10 })
  .filter((s) => s.trim().length >= 2);

// Drena as promises pendentes (respostas do Mock_API) sob fake timers,
// envolvendo em act() para aplicar as atualizações de estado do React.
async function drenarPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useBeneficiadas — preservação da lista anterior sob falha", () => {
  // Feature: catalogo-instituicoes-wizard, Property 7: Preservação da lista anterior sob falha
  // Validates: Requirements 2.4, 7.3
  it("Property 7: a lista exibida permanece igual à anterior quando a busca seguinte falha", async () => {
    await fc.assert(
      fc.asyncProperty(
        listaCarregadaArb,
        termoBuscaArb,
        async (listaInicial, termo) => {
          vi.useFakeTimers();
          const mock = instalarMockFetch();
          try {
            // 1ª busca (catálogo completo na montagem): responde 200 com a lista.
            mock.responderCom({ status: 200, body: listaInicial });

            const { result } = renderHook(() => useBeneficiadas());

            // Estado inicial esperado durante a montagem.
            expect(result.current.estado).toBe<EstadoBeneficiadas>("carregando");

            // Deixa a resposta da busca inicial ser aplicada.
            await drenarPromises();

            // A lista válida não é vazia => estado "carregado" com a lista exata.
            expect(result.current.estado).toBe<EstadoBeneficiadas>("carregado");
            expect(result.current.beneficiadas).toEqual(listaInicial);

            const listaAnterior = result.current.beneficiadas;

            // 2ª busca: termo dispara nova requisição, cuja resposta falha.
            mock.falharPorRede();

            act(() => {
              result.current.definirTermoBusca(termo);
            });

            // Avança o debounce de 300 ms para disparar a busca com o termo.
            await act(async () => {
              await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
            });

            // Drena a falha da resposta.
            await drenarPromises();

            // A falha transiciona para "erro" sem tocar na lista anterior:
            // nenhuma lista parcial, nenhum fallback simulado (Req 2.4, 7.3).
            expect(result.current.estado).toBe<EstadoBeneficiadas>("erro");
            expect(result.current.beneficiadas).toEqual(listaInicial);
            expect(result.current.beneficiadas).toBe(listaAnterior);
          } finally {
            mock.restaurar();
            vi.useRealTimers();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
