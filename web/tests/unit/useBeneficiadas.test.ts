// Testes de unidade de exemplo/edge do hook useBeneficiadas
// (web/src/components/campaign-wizard/hooks/useBeneficiadas.ts).
//
// Complementam os testes de propriedade (anti-stale, retry, preserva-lista,
// preserva-termo) com exemplos concretos dos comportamentos observáveis que não
// são cobertos por aquelas propriedades:
//
//  - a busca inicial dispara na montagem, imediatamente (Requisito 1.1);
//  - o debounce de 300 ms atrasa o disparo da busca ao digitar um termo
//    (Requisito 3.3): antes de 300 ms nenhuma requisição nova é emitida; ao
//    completar 300 ms a requisição é emitida;
//  - ao expirar o tempo limite (o efetivo é min(10s, 30s) = 10s) o carregamento
//    é encerrado e o hook transiciona para "erro" (Requisitos 1.5, 2.2);
//  - quando `mensagemDeErro` volta vazia, o hook usa a mensagem padrão
//    (Requisitos 2.5, 4.7).
//
// Observação sobre o tempo limite: o hook calcula TIMEOUT_MS = min(10s, 30s),
// portanto o caminho de 30 s é inalcançável. Testamos o comportamento
// observável: nada dispara antes de 10 s e o estado vira "erro" aos 10 s.
//
// O `request` real (services/api.ts) é exercitado contra o Mock_API
// (instalarMockFetch), nunca contra rede de verdade. Fake timers controlam o
// debounce e o tempo limite.

import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useBeneficiadas } from "@/components/campaign-wizard/hooks/useBeneficiadas";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch } from "../helpers/mockFetch";

// Devem casar com os valores internos do hook.
const DEBOUNCE_MS = 300;
const TIMEOUT_EFETIVO_MS = 10_000; // min(10s busca, 30s requisição)

// Mensagem padrão que o hook exibe quando `mensagemDeErro` volta vazia/ausente.
const MENSAGEM_PADRAO =
  "Não foi possível carregar as instituições. Tente novamente.";

// Lista mínima válida (id e nome não-vazios => sobrevive ao filtro do serviço).
function listaValida(sufixo: string): Beneficiada[] {
  return [
    {
      tipo: "INSTITUICAO",
      id: `id-${sufixo}`,
      nome: `Beneficiada ${sufixo}`,
      causa: null,
      cidade: null,
      uf: null,
      descricao: `descricao-${sufixo}`,
      site: null,
      logoArquivoId: null,
    },
  ];
}

// Drena microtasks pendentes (resolução das promises do Mock_API) sob fake
// timers, envolvendo em act() para aplicar as atualizações de estado do React.
async function drenarPromises(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useBeneficiadas — exemplos/edge", () => {
  // Validates: Requirements 1.1
  it("dispara a busca do catálogo completo na montagem", async () => {
    vi.useFakeTimers();
    const mock = instalarMockFetch();
    try {
      mock.responderPara("/beneficiadas", {
        status: 200,
        body: listaValida("inicial"),
      });

      const { result } = renderHook(() => useBeneficiadas());

      // Imediatamente após montar, já existe uma requisição em voo e o estado é
      // "carregando" — a busca não aguarda interação do usuário (Req 1.1).
      expect(result.current.estado).toBe("carregando");
      expect(mock.chamadas.length).toBe(1);
      // Sem termo => catálogo completo: a URL não carrega o parâmetro de busca.
      expect(mock.ultimaChamada().url).toContain("/beneficiadas");
      expect(mock.ultimaChamada().url).not.toContain("busca=");

      // A resposta aplica a lista e transiciona para "carregado".
      await drenarPromises();
      expect(result.current.estado).toBe("carregado");
      expect(result.current.beneficiadas).toEqual(listaValida("inicial"));
    } finally {
      mock.restaurar();
      vi.useRealTimers();
    }
  });

  // Validates: Requirements 3.3
  it("atrasa o disparo da busca pelo debounce de 300 ms ao digitar o termo", async () => {
    vi.useFakeTimers();
    const mock = instalarMockFetch();
    try {
      mock.responderPara("/beneficiadas", {
        status: 200,
        body: listaValida("catalogo"),
      });

      const { result } = renderHook(() => useBeneficiadas());

      // Resolve a busca inicial da montagem.
      await drenarPromises();
      expect(mock.chamadas.length).toBe(1);

      // Prepara a resposta da busca por termo.
      mock.responderPara("/beneficiadas?busca=abc", {
        status: 200,
        body: listaValida("abc"),
      });

      // Usuário digita um termo >= 2 caracteres.
      act(() => {
        result.current.definirTermoBusca("abc");
      });

      // Logo antes de completar o debounce: NENHUMA requisição nova foi emitida.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
      });
      expect(mock.chamadas.length).toBe(1);

      // Ao completar os 300 ms, a busca com o termo é finalmente emitida.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      await drenarPromises();

      expect(mock.chamadas.length).toBe(2);
      expect(mock.ultimaChamada().url).toContain("busca=abc");
    } finally {
      mock.restaurar();
      vi.useRealTimers();
    }
  });

  // Validates: Requirements 1.5, 2.2
  it("encerra o carregamento e transiciona para erro ao expirar o tempo limite", async () => {
    vi.useFakeTimers();
    // Para exercitar o tempo limite, a requisição precisa ficar pendente além
    // dos 10 s. O Mock_API resolve/rejeita de imediato, então aqui instalamos
    // um fetch que NUNCA resolve: só o timeout interno do hook encerra o
    // carregamento (Req 1.5, 2.2). Nenhuma rede real é usada.
    const stubPendente = (() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    vi.stubGlobal("fetch", stubPendente);
    try {
      const { result } = renderHook(() => useBeneficiadas());

      // Em voo logo após a montagem.
      expect(result.current.estado).toBe("carregando");

      // Logo antes de 10 s: ainda carregando (o timeout não disparou).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(TIMEOUT_EFETIVO_MS - 1);
      });
      expect(result.current.estado).toBe("carregando");

      // Ao atingir os 10 s, o tempo limite encerra o carregamento e vira "erro".
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      await drenarPromises();

      expect(result.current.estado).toBe("erro");
      // O timeout aplica uma mensagem não-vazia ao usuário.
      expect(result.current.mensagemErro.trim().length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  // Validates: Requirements 2.5, 4.7
  it("usa a mensagem padrão quando mensagemDeErro volta vazia", async () => {
    vi.useFakeTimers();
    const mock = instalarMockFetch();
    try {
      // Status 400 com message vazia: mensagemDeErro devolve "" (não é 0, não é
      // >= 500, e 400 não está no mapa de status), então o hook aplica a
      // mensagem padrão (Req 2.5, 4.7).
      mock.responderPara("/beneficiadas", {
        status: 400,
        body: { message: "" },
      });

      const { result } = renderHook(() => useBeneficiadas());

      await drenarPromises();

      expect(result.current.estado).toBe("erro");
      expect(result.current.mensagemErro).toBe(MENSAGEM_PADRAO);
    } finally {
      mock.restaurar();
      vi.useRealTimers();
    }
  });
});
