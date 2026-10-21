// Teste de propriedade anti-stale do hook `useBeneficiadas`
// (web/src/components/campaign-wizard/hooks/useBeneficiadas.ts).
//
// Cobre a Property 5 do design (catalogo-instituicoes-wizard): uma resposta
// obsoleta (de um termo antigo) nunca sobrescreve a resposta da requisição mais
// recente. O hook guarda um identificador monotônico por requisição e só aplica
// o resultado da sequência mais recente; respostas que chegam fora de ordem são
// descartadas.
//
// Estratégia: cada alteração de termo (após o debounce de 300 ms) dispara uma
// chamada a `listarBeneficiadas`, que por sua vez chama o `fetch` global. Aqui o
// `fetch` é substituído por um stub controlável que NÃO resolve imediatamente —
// cada chamada devolve uma Promise pendente cujo cumprimento fica sob controle
// do teste. Isso permite reordenar artificialmente a chegada das respostas (a
// mais recente pode chegar antes ou depois das antigas) e afirmar que o estado
// final do hook sempre reflete a resposta da ÚLTIMA requisição emitida.
//
// Fake timers controlam tanto o debounce de 300 ms quanto a ordenação; nenhuma
// rede real é usada (o `fetch` global é stubado por iteração).

import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import fc from "fast-check";

import { useBeneficiadas } from "@/components/campaign-wizard/hooks/useBeneficiadas";
import type { Beneficiada } from "@/services/instituicoes";

// Debounce aplicado pelo hook antes de disparar cada busca (deve casar com o
// valor interno do hook).
const DEBOUNCE_MS = 300;

// ──────────────────────────────────────────────────────────────────────────
// Stub de fetch controlável: registra cada chamada e devolve uma Promise cujo
// cumprimento é disparado manualmente pelo teste, permitindo reordenar as
// respostas. O corpo devolvido é um `Response`-like compatível com o subconjunto
// consumido pelo Cliente_HTTP (status/ok/headers.get/json).
// ──────────────────────────────────────────────────────────────────────────
type ChamadaControlavel = {
  url: string;
  // Resolve esta chamada com a lista informada (status 200).
  resolver: (lista: Beneficiada[]) => void;
};

function respostaOk(body: unknown): Response {
  const headers = {
    get(nome: string): string | null {
      return nome.toLowerCase() === "content-type" ? "application/json" : null;
    },
  };
  return {
    status: 200,
    ok: true,
    headers,
    async json(): Promise<unknown> {
      return body;
    },
    async text(): Promise<string> {
      return JSON.stringify(body);
    },
  } as unknown as Response;
}

function instalarFetchControlavel(): {
  chamadas: ChamadaControlavel[];
} {
  const chamadas: ChamadaControlavel[] = [];

  const stub = ((input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : String(input);

    let resolverResposta!: (r: Response) => void;
    const promessa = new Promise<Response>((res) => {
      resolverResposta = res;
    });

    chamadas.push({
      url,
      resolver: (lista) => resolverResposta(respostaOk(lista)),
    });

    return promessa;
  }) as unknown as typeof fetch;

  vi.stubGlobal("fetch", stub);
  return { chamadas };
}

// Gera uma lista determinística e única por índice de requisição, de modo que a
// lista aplicada pelo hook identifique sem ambiguidade QUAL resposta venceu.
function listaParaIndice(indice: number): Beneficiada[] {
  return [
    {
      tipo: "INSTITUICAO",
      id: `req-${indice}`,
      nome: `Beneficiada da requisição ${indice}`,
      causa: null,
      cidade: null,
      uf: null,
      descricao: `descricao-${indice}`,
      site: null,
      logoArquivoId: null,
    },
  ];
}

afterEach(() => {
  cleanup();
});

describe("useBeneficiadas — anti-stale", () => {
  // Feature: catalogo-instituicoes-wizard, Property 5: Resposta obsoleta nunca sobrescreve a mais recente
  // Validates: Requirements 3.3, 5.5
  it("Property 5: Resposta obsoleta nunca sobrescreve a mais recente", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Sequência de termos de busca (2+ caracteres para garantir filtro) e
        // uma permutação da ordem em que as respostas chegam de volta.
        fc
          .array(
            fc.string({ minLength: 2, maxLength: 8 }).map((s) => `t${s}`),
            { minLength: 1, maxLength: 5 },
          )
          .chain((termos) =>
            // A ordem de chegada é uma permutação dos índices das requisições
            // (0 = busca inicial da montagem; 1..n = cada termo digitado).
            fc
              .constant(termos)
              .chain((t) =>
                fc
                  .shuffledSubarray(
                    Array.from({ length: t.length + 1 }, (_, i) => i),
                    { minLength: t.length + 1, maxLength: t.length + 1 },
                  )
                  .map((ordemChegada) => ({ termos: t, ordemChegada })),
              ),
          ),
        async ({ termos, ordemChegada }) => {
          const { chamadas } = instalarFetchControlavel();
          vi.useFakeTimers();

          try {
            const { result } = renderHook(() => useBeneficiadas());

            // Requisição 0 (índice 0): busca inicial da montagem (catálogo
            // completo), disparada por efeito na montagem.
            await act(async () => {
              await Promise.resolve();
            });

            // Cada termo digitado agenda uma nova busca após o debounce.
            for (const termo of termos) {
              act(() => {
                result.current.definirTermoBusca(termo);
              });
              // Avança o debounce para que a busca seja efetivamente emitida.
              await act(async () => {
                await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
              });
            }

            // Neste ponto, todas as requisições já foram emitidas: índice 0 é a
            // montagem e índices 1..n correspondem a cada termo. O número de
            // chamadas capturadas deve ser termos.length + 1.
            const totalEsperado = termos.length + 1;
            expect(chamadas.length).toBe(totalEsperado);

            // A requisição mais recente é a de maior índice (a última emitida).
            const indiceMaisRecente = totalEsperado - 1;

            // Resolve as respostas FORA DE ORDEM, conforme a permutação gerada.
            // Mesmo que a resposta mais recente chegue primeiro e as antigas
            // depois, o estado final deve refletir apenas a mais recente.
            for (const indice of ordemChegada) {
              await act(async () => {
                chamadas[indice].resolver(listaParaIndice(indice));
                // Deixa o microtask do .then()/.catch() do hook assentar.
                await vi.advanceTimersByTimeAsync(0);
              });
            }

            // Deixa qualquer microtask/efeito residual assentar após a última
            // resposta aplicada.
            await act(async () => {
              await vi.advanceTimersByTimeAsync(0);
            });

            // Invariante anti-stale: o estado final corresponde SEMPRE à
            // resposta da requisição mais recente, independentemente da ordem
            // de chegada das demais.
            expect(result.current.estado).toBe("carregado");
            expect(result.current.beneficiadas).toEqual(
              listaParaIndice(indiceMaisRecente),
            );
            expect(result.current.beneficiadas[0]?.id).toBe(
              `req-${indiceMaisRecente}`,
            );
          } finally {
            vi.runOnlyPendingTimers();
            vi.useRealTimers();
            cleanup();
            vi.unstubAllGlobals();
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 30_000);
});
