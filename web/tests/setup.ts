// Bootstrap global da suíte de testes do frontend (web/).
//
// Responsabilidades (Requisitos 9.1, 9.5, 9.6):
// - Registrar os matchers de @testing-library/jest-dom no expect do Vitest.
// - Instalar um `fetch` padrão (guarda anti-rede) que lança imediatamente ao
//   ser chamado sem um stub configurado, nomeando o destino não interceptado
//   e, com isso, falhando o teste antes de qualquer transmissão externa.
// - Garantir reset por teste via `afterEach` global: restaurar `fetch`, limpar
//   contadores/respostas, desfazer stubs de `window`/storage e desmontar a
//   árvore React, assegurando independência de ordem de execução.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Guarda anti-rede: qualquer chamada a `fetch` sem um stub de Mock_API
// configurado é interrompida aqui. Nenhuma requisição real é emitida; o teste
// falha de forma explícita, apontando o destino não interceptado (Requisito 9.5).
function instalarGuardaAntiRede(): void {
  const guarda = ((input: RequestInfo | URL, init?: RequestInit): never => {
    const destino =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : String(input);
    const metodo = (init?.method ?? "GET").toUpperCase();

    throw new Error(
      `Requisição de rede não interceptada: ${metodo} ${destino}. ` +
        "Configure uma resposta no Mock_API (instalarMockFetch) antes de " +
        "exercitar este fluxo. Nenhuma conexão real é permitida nos testes.",
    );
  }) as unknown as typeof fetch;

  vi.stubGlobal("fetch", guarda);
}

// Antes de cada teste, começamos sempre do estado "sem rede permitida".
// Testes que precisam de HTTP instalam o Mock_API, que sobrescreve esta guarda.
beforeEach(() => {
  instalarGuardaAntiRede();
});

// Após cada teste (passando ou falhando), restaura tudo ao estado inicial para
// que a ordem de execução não altere os resultados (Requisito 9.6).
afterEach(() => {
  // Desmonta componentes React montados pelo @testing-library para liberar o DOM.
  cleanup();
  // Desfaz todos os globais stubados no teste (fetch, matchMedia, storage, etc.).
  vi.unstubAllGlobals();
  // Restaura spies/mocks (vi.spyOn em window/storage e afins) ao comportamento original.
  vi.restoreAllMocks();
});
