// Asserção de Contrato_Requisicao (Contrato_Requisicao) — tests/helpers/requestContract.ts
//
// Verifica que uma chamada capturada pelo Mock_API respeita o contrato HTTP
// esperado do frontend, observado em `services/api.ts`:
//   fetch(`/api${path}`, { credentials: "include", ...init })
//
// Regras aplicadas (Requisitos 2.5 e 1.5):
// - A URL efetiva inicia com o prefixo `/api` e termina com `esperado.rota`.
// - O método é comparado de forma case-insensitive (normalizado em maiúsculas).
// - `credentials` deve ser `"include"`, salvo override explícito no contrato.
// - Corpo JSON é comparado por igualdade estrutural (parseando a string de corpo).
// - Corpo FormData é comparado entrada a entrada via `lerFormData`.
// - A presença/ausência e o valor do cabeçalho `Content-Type` são verificados.
// - Toda divergência produz uma mensagem legível com esperado × recebido (Req 1.5).

import { expect } from "vitest";

import { lerFormData } from "./formData";
import type { ChamadaCapturada } from "./mockFetch";

/**
 * Forma declarada do contrato HTTP esperado para uma chamada interceptada.
 */
export type ContratoEsperado = {
  /** Método HTTP esperado, ex.: "POST", "DELETE". Comparado sem distinção de caixa. */
  metodo: string;
  /** Sufixo da rota, ex.: "/sessoes". O helper verifica o prefixo "/api". */
  rota: string;
  /** Valor esperado de `credentials`. Default esperado: "include". */
  credentials?: RequestCredentials;
  /** Corpo esperado em JSON, comparado por igualdade estrutural. */
  corpoJson?: unknown;
  /** Entradas esperadas no FormData do corpo. */
  corpoFormData?: Record<string, string | File>;
  /** Quando true, o cabeçalho Content-Type NÃO deve existir no init. */
  semContentTypeManual?: boolean;
  /** Valor esperado do Content-Type quando definido manualmente. */
  contentType?: string;
};

/**
 * Normaliza os headers de um `RequestInit` em um `Headers`, aceitando as três
 * formas suportadas pela plataforma (Headers, array de tuplas e objeto literal).
 */
function normalizarHeaders(init: RequestInit): Headers {
  const bruto = init.headers;
  if (!bruto) {
    return new Headers();
  }
  return new Headers(bruto as HeadersInit);
}

/**
 * Monta um prefixo legível para as mensagens de falha, identificando a chamada
 * sob análise (método + URL efetiva).
 */
function rotulo(chamada: ChamadaCapturada): string {
  return `${chamada.method} ${chamada.url}`;
}

/**
 * Verifica a chamada capturada contra o contrato esperado. Lança (via `expect`
 * do Vitest) com uma diferença legível ao primeiro desvio encontrado.
 */
export function assertContrato(
  chamada: ChamadaCapturada,
  esperado: ContratoEsperado,
): void {
  const onde = rotulo(chamada);

  // --- Método ------------------------------------------------------------
  const metodoRecebido = chamada.method.toUpperCase();
  const metodoEsperado = esperado.metodo.toUpperCase();
  expect(
    metodoRecebido,
    `Contrato (${onde}): método esperado "${metodoEsperado}", recebido "${metodoRecebido}".`,
  ).toBe(metodoEsperado);

  // --- Rota: prefixo "/api" + sufixo esperado ----------------------------
  expect(
    chamada.url.startsWith("/api"),
    `Contrato (${onde}): a URL efetiva deve iniciar com o prefixo "/api". ` +
      `Esperado prefixo "/api", recebido "${chamada.url}".`,
  ).toBe(true);

  expect(
    chamada.url.endsWith(esperado.rota),
    `Contrato (${onde}): a URL efetiva deve terminar com a rota "${esperado.rota}". ` +
      `Esperado sufixo "${esperado.rota}", recebido "${chamada.url}".`,
  ).toBe(true);

  // A rota efetiva completa esperada é "/api" + sufixo. Verificamos a
  // composição exata para evitar falso-positivo quando o sufixo é vazio.
  const rotaCompletaEsperada = `/api${esperado.rota}`;
  expect(
    chamada.url,
    `Contrato (${onde}): rota efetiva esperada "${rotaCompletaEsperada}", recebida "${chamada.url}".`,
  ).toBe(rotaCompletaEsperada);

  // --- credentials: "include" salvo override -----------------------------
  const credentialsEsperado: RequestCredentials =
    esperado.credentials ?? "include";
  const credentialsRecebido = chamada.init.credentials;
  expect(
    credentialsRecebido,
    `Contrato (${onde}): credentials esperado "${credentialsEsperado}", ` +
      `recebido "${String(credentialsRecebido)}".`,
  ).toBe(credentialsEsperado);

  // --- Content-Type ------------------------------------------------------
  const headers = normalizarHeaders(chamada.init);
  const temContentType = headers.has("content-type");
  const contentTypeRecebido = headers.get("content-type");

  if (esperado.semContentTypeManual) {
    expect(
      temContentType,
      `Contrato (${onde}): esperado NENHUM Content-Type manual no init ` +
        `(para preservar o boundary automático), mas recebido "${String(contentTypeRecebido)}".`,
    ).toBe(false);
  }

  if (esperado.contentType !== undefined) {
    expect(
      contentTypeRecebido,
      `Contrato (${onde}): Content-Type esperado "${esperado.contentType}", ` +
        `recebido "${String(contentTypeRecebido)}".`,
    ).toBe(esperado.contentType);
  }

  // --- Corpo JSON (igualdade estrutural) ---------------------------------
  if (esperado.corpoJson !== undefined) {
    const corpoBruto = chamada.body;
    expect(
      typeof corpoBruto === "string",
      `Contrato (${onde}): esperado corpo JSON (string serializada), ` +
        `recebido corpo do tipo "${corpoBruto === null || corpoBruto === undefined ? String(corpoBruto) : typeof corpoBruto}".`,
    ).toBe(true);

    let corpoParseado: unknown;
    try {
      corpoParseado = JSON.parse(corpoBruto as string) as unknown;
    } catch (erro) {
      throw new Error(
        `Contrato (${onde}): corpo não é um JSON válido. ` +
          `Esperado JSON estruturalmente igual a ${JSON.stringify(esperado.corpoJson)}, ` +
          `recebido corpo bruto "${String(corpoBruto)}". ` +
          `Erro de parse: ${erro instanceof Error ? erro.message : String(erro)}.`,
      );
    }

    expect(
      corpoParseado,
      `Contrato (${onde}): corpo JSON diverge do esperado. ` +
        `Esperado ${JSON.stringify(esperado.corpoJson)}, recebido ${JSON.stringify(corpoParseado)}.`,
    ).toEqual(esperado.corpoJson);
  }

  // --- Corpo FormData ----------------------------------------------------
  if (esperado.corpoFormData !== undefined) {
    const corpo = chamada.body;
    expect(
      corpo instanceof FormData,
      `Contrato (${onde}): esperado corpo do tipo FormData, ` +
        `recebido "${corpo === null || corpo === undefined ? String(corpo) : typeof corpo}".`,
    ).toBe(true);

    const recebido = lerFormData(corpo as FormData);
    const esperadoFD = esperado.corpoFormData;

    const chavesEsperadas = Object.keys(esperadoFD).sort();
    const chavesRecebidas = Object.keys(recebido).sort();
    expect(
      chavesRecebidas,
      `Contrato (${onde}): o conjunto de campos do FormData diverge. ` +
        `Esperado [${chavesEsperadas.join(", ")}], recebido [${chavesRecebidas.join(", ")}].`,
    ).toEqual(chavesEsperadas);

    for (const chave of chavesEsperadas) {
      const valorEsperado = esperadoFD[chave];
      const valorRecebido = recebido[chave];

      if (valorEsperado instanceof File) {
        expect(
          valorRecebido instanceof File,
          `Contrato (${onde}): campo "${chave}" do FormData deveria ser um File. ` +
            `Esperado File "${valorEsperado.name}", recebido "${String(valorRecebido)}".`,
        ).toBe(true);
        const arquivoRecebido = valorRecebido as File;
        expect(
          arquivoRecebido.name,
          `Contrato (${onde}): nome do arquivo em "${chave}" diverge. ` +
            `Esperado "${valorEsperado.name}", recebido "${arquivoRecebido.name}".`,
        ).toBe(valorEsperado.name);
      } else {
        expect(
          valorRecebido,
          `Contrato (${onde}): campo "${chave}" do FormData diverge. ` +
            `Esperado "${String(valorEsperado)}", recebido "${String(valorRecebido)}".`,
        ).toBe(valorEsperado);
      }
    }
  }
}
