// Mock_API — interceptação controlada do `fetch` global (Requisitos 9.1, 9.4, 9.6).
//
// Este helper substitui o `fetch` global (via vi.stubGlobal) por um stub que:
// - devolve respostas pré-definidas, compatíveis com `Response` no que o
//   Cliente_HTTP (web/src/services/api.ts) consome: `status`, `ok` (200–299),
//   `headers.get("content-type")` e `json()`;
// - para status 204, não devolve corpo nem content-type, exercitando o atalho
//   de `undefined` do cliente;
// - pode simular falha de rede (`falharPorRede`), fazendo o stub rejeitar e
//   assim exercitando o `catch` que vira `ApiError(0, ...)`;
// - captura cada chamada `(url, method, init, body)` em ordem, para asserção de
//   contrato posterior.
//
// Toda resposta vem de dados controlados declarados no próprio teste (fixtures
// inline); nenhuma conexão real é estabelecida. O `restaurar()` devolve o
// `fetch` ao estado anterior e zera as definições/contadores, garantindo que a
// ordem de execução não altere resultados (chamado também pelo afterEach global
// através de vi.unstubAllGlobals).

import { vi } from "vitest";

export type RespostaSimulada = {
  status: number;
  // Corpo serializado como JSON quando jsonContentType = true.
  body?: unknown;
  // Define content-type "application/json" (default: true quando body existe).
  jsonContentType?: boolean;
  headers?: Record<string, string>;
};

export type ChamadaCapturada = {
  url: string; // ex.: "/api/sessoes"
  method: string; // normalizado em maiúsculas
  init: RequestInit;
  body: BodyInit | null | undefined;
};

export interface MockFetch {
  // Define a resposta padrão usada por qualquer chamada sem resposta por path.
  responderCom(resposta: RespostaSimulada): void;
  // Define a resposta para chamadas cuja URL casar com o path informado.
  responderPara(path: string, resposta: RespostaSimulada): void;
  // Simula exceção de rede (fetch rejeita) — para ApiError(0, ...).
  falharPorRede(): void;
  // Chamadas capturadas, em ordem.
  chamadas: ChamadaCapturada[];
  ultimaChamada(): ChamadaCapturada;
  restaurar(): void; // chamado pelo afterEach global
}

// Normaliza o primeiro argumento de `fetch` em uma string de URL.
function extrairUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  return String(input);
}

// Objeto compatível com `Response` no subconjunto consumido pelo Cliente_HTTP.
function construirResposta(resposta: RespostaSimulada): Response {
  const { status } = resposta;
  const ok = status >= 200 && status <= 299;

  // 204: sem corpo e sem content-type (atalho de `undefined` do cliente).
  const semCorpo = status === 204;

  const temBody = !semCorpo && resposta.body !== undefined;
  const usarJson =
    !semCorpo && (resposta.jsonContentType ?? resposta.body !== undefined);

  // Monta os cabeçalhos: content-type derivado + overrides explícitos.
  const headersIniciais: Record<string, string> = {};
  if (usarJson) {
    headersIniciais["content-type"] = "application/json";
  }
  if (!semCorpo && resposta.headers) {
    for (const [chave, valor] of Object.entries(resposta.headers)) {
      headersIniciais[chave.toLowerCase()] = valor;
    }
  }

  const headers = {
    get(nome: string): string | null {
      return headersIniciais[nome.toLowerCase()] ?? null;
    },
  };

  const corpoJson = temBody ? resposta.body : undefined;

  const respostaSimulada = {
    status,
    ok,
    headers,
    async json(): Promise<unknown> {
      // Reproduz o comportamento do cliente, que só chama json() quando o
      // content-type indica JSON. Se não houver corpo, devolve undefined.
      return corpoJson;
    },
    async text(): Promise<string> {
      return corpoJson === undefined ? "" : JSON.stringify(corpoJson);
    },
  };

  return respostaSimulada as unknown as Response;
}

export function instalarMockFetch(): MockFetch {
  const chamadas: ChamadaCapturada[] = [];
  const respostasPorPath = new Map<string, RespostaSimulada>();
  let respostaPadrao: RespostaSimulada | null = null;
  let rejeitarPorRede = false;

  // Resolve a resposta configurada para uma URL capturada. A URL real inclui o
  // prefixo "/api" (o Cliente_HTTP chama `/api${path}`), então aceitamos tanto
  // correspondência exata quanto por sufixo do path informado em responderPara.
  function resolverResposta(url: string): RespostaSimulada | null {
    if (respostasPorPath.has(url)) {
      return respostasPorPath.get(url)!;
    }
    for (const [path, resposta] of respostasPorPath) {
      if (url === path || url.endsWith(path)) {
        return resposta;
      }
    }
    return respostaPadrao;
  }

  const stub = ((
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = extrairUrl(input);
    const metodo = (init?.method ?? "GET").toUpperCase();

    chamadas.push({
      url,
      method: metodo,
      init: init ?? {},
      body: init?.body,
    });

    if (rejeitarPorRede) {
      return Promise.reject(
        new Error(`Falha de rede simulada (Mock_API) para ${metodo} ${url}`),
      );
    }

    const resposta = resolverResposta(url);
    if (resposta === null) {
      return Promise.reject(
        new Error(
          `Mock_API sem resposta configurada para ${metodo} ${url}. ` +
            "Use responderCom(...) ou responderPara(path, ...) antes de exercitar este fluxo.",
        ),
      );
    }

    return Promise.resolve(construirResposta(resposta));
  }) as unknown as typeof fetch;

  vi.stubGlobal("fetch", stub);

  const mock: MockFetch = {
    responderCom(resposta: RespostaSimulada): void {
      respostaPadrao = resposta;
    },
    responderPara(path: string, resposta: RespostaSimulada): void {
      respostasPorPath.set(path, resposta);
    },
    falharPorRede(): void {
      rejeitarPorRede = true;
    },
    chamadas,
    ultimaChamada(): ChamadaCapturada {
      if (chamadas.length === 0) {
        throw new Error(
          "Mock_API: nenhuma chamada capturada ainda — ultimaChamada() não tem o que retornar.",
        );
      }
      return chamadas[chamadas.length - 1];
    },
    restaurar(): void {
      vi.unstubAllGlobals();
      chamadas.length = 0;
      respostasPorPath.clear();
      respostaPadrao = null;
      rejeitarPorRede = false;
    },
  };

  return mock;
}
