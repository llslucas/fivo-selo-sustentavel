// Testes condicionais de serviços opcionais: `instituicoes.ts` e `campanhas.ts`
// (Requisitos 7.1, 7.2).
//
// IMPORTANTE — ESTADO ATUAL:
// Os serviços `web/src/services/instituicoes.ts` e `web/src/services/campanhas.ts`
// AINDA NÃO EXISTEM (serão criados em tasks futuras). Por isso, cada bloco usa
// `describe.skipIf(!servicoExiste("<arquivo>.ts"))`: enquanto o módulo não
// existir, `servicoExiste` retorna `false` e o bloco inteiro é PULADO de forma
// limpa — a suíte permanece verde (um arquivo contendo apenas testes pulados é
// considerado "passado" pelo Vitest).
//
// QUANDO O SERVIÇO PASSAR A EXISTIR:
// O bloco correspondente deixa de ser pulado e os testes passam a rodar
// automaticamente. Como a forma exata da API (nomes de funções exportadas e
// formato de retorno) só será definida quando o serviço existir, os corpos de
// teste abaixo são DEFENSIVOS: eles descobrem, em tempo de execução, uma função
// de listagem/busca convencionalmente nomeada no módulo e a exercitam com:
//   - ao menos 1 sucesso (resposta 2xx), afirmando o resultado retornado; e
//   - ao menos 1 falha (resposta 4xx/5xx), afirmando o erro propagado (ApiError).
//
// Ao implementar o serviço de verdade, estes corpos DEVEM ser revisados para
// afirmar as funções realmente exportadas (ex.: `listarInstituicoes`,
// `listarCampanhas`) e o formato concreto do payload. A busca por nome
// convencional abaixo é um melhor-esforço para já exercitar o fluxo primário
// de lista/fetch assim que o módulo surgir, sem precisar reescrever o esqueleto.

import { describe, it, expect } from "vitest";

import { importarSeExistir, servicoExiste } from "../helpers/moduleExists";
import { instalarMockFetch } from "../helpers/mockFetch";
import { ApiError } from "@/services/api";

// Nomes convencionais de função de listagem/busca procurados no módulo quando
// ele existir. Ajuste/estenda conforme a convenção adotada pelo serviço real.
const NOMES_LISTAGEM_INSTITUICOES = [
  "listarInstituicoes",
  "buscarInstituicoes",
  "obterInstituicoes",
  "listar",
  "listarTodas",
];

const NOMES_LISTAGEM_CAMPANHAS = [
  "listarCampanhas",
  "buscarCampanhas",
  "obterCampanhas",
  "listar",
  "listarTodas",
];

// Localiza a primeira função exportada cujo nome esteja na lista de candidatos.
// Retorna `null` quando nenhuma convenção casa (o teste então falha com uma
// mensagem explicando que a convenção precisa ser ajustada ao serviço real).
function encontrarFuncao(
  modulo: Record<string, unknown>,
  candidatos: string[],
): ((...args: unknown[]) => unknown) | null {
  for (const nome of candidatos) {
    const alvo = modulo[nome];
    if (typeof alvo === "function") {
      return alvo as (...args: unknown[]) => unknown;
    }
  }
  return null;
}

// --- instituicoes.ts -------------------------------------------------------
// Pulado hoje: o arquivo não existe (servicoExiste("instituicoes.ts") === false).
describe.skipIf(!servicoExiste("instituicoes.ts"))("instituicoes", () => {
  it("retorna os dados em caso de sucesso (2xx)", async () => {
    const modulo = await importarSeExistir<Record<string, unknown>>(
      "instituicoes.ts",
    );
    expect(
      modulo,
      "instituicoes.ts deveria existir quando este bloco roda.",
    ).not.toBeNull();

    const listar = encontrarFuncao(modulo!, NOMES_LISTAGEM_INSTITUICOES);
    expect(
      listar,
      "Nenhuma função de listagem convencional encontrada em instituicoes.ts. " +
        "Ajuste os corpos deste teste para a API real exportada pelo serviço.",
    ).not.toBeNull();

    const mock = instalarMockFetch();
    try {
      // Fixture inline representando uma listagem bem-sucedida.
      const corpoEsperado = [{ id: 1, nome: "Instituição Exemplo" }];
      mock.responderCom({ status: 200, body: corpoEsperado });

      const resultado = await listar!();

      // Afirma o resultado retornado pelo fluxo primário de lista/fetch.
      expect(resultado).toBeDefined();
      // Ao implementar o serviço, substitua pela asserção do formato concreto
      // (ex.: expect(resultado).toEqual(corpoEsperado)).
    } finally {
      mock.restaurar();
    }
  });

  it("propaga ApiError em caso de falha (4xx/5xx)", async () => {
    const modulo = await importarSeExistir<Record<string, unknown>>(
      "instituicoes.ts",
    );
    const listar = encontrarFuncao(modulo!, NOMES_LISTAGEM_INSTITUICOES);
    expect(listar).not.toBeNull();

    const mock = instalarMockFetch();
    try {
      mock.responderCom({
        status: 500,
        body: { statusCode: 500, message: "Erro interno" },
      });

      // Afirma o resultado: o fluxo deve rejeitar com ApiError na falha.
      await expect(listar!()).rejects.toBeInstanceOf(ApiError);
    } finally {
      mock.restaurar();
    }
  });
});

// --- campanhas.ts ----------------------------------------------------------
// Pulado hoje: o arquivo não existe (servicoExiste("campanhas.ts") === false).
describe.skipIf(!servicoExiste("campanhas.ts"))("campanhas", () => {
  it("retorna os dados em caso de sucesso (2xx)", async () => {
    const modulo = await importarSeExistir<Record<string, unknown>>(
      "campanhas.ts",
    );
    expect(
      modulo,
      "campanhas.ts deveria existir quando este bloco roda.",
    ).not.toBeNull();

    const listar = encontrarFuncao(modulo!, NOMES_LISTAGEM_CAMPANHAS);
    expect(
      listar,
      "Nenhuma função de listagem convencional encontrada em campanhas.ts. " +
        "Ajuste os corpos deste teste para a API real exportada pelo serviço.",
    ).not.toBeNull();

    const mock = instalarMockFetch();
    try {
      const corpoEsperado = [{ id: 1, titulo: "Campanha Exemplo" }];
      mock.responderCom({ status: 200, body: corpoEsperado });

      const resultado = await listar!();

      expect(resultado).toBeDefined();
      // Ao implementar o serviço, substitua pela asserção do formato concreto.
    } finally {
      mock.restaurar();
    }
  });

  it("propaga ApiError em caso de falha (4xx/5xx)", async () => {
    const modulo = await importarSeExistir<Record<string, unknown>>(
      "campanhas.ts",
    );
    const listar = encontrarFuncao(modulo!, NOMES_LISTAGEM_CAMPANHAS);
    expect(listar).not.toBeNull();

    const mock = instalarMockFetch();
    try {
      mock.responderCom({
        status: 404,
        body: { statusCode: 404, message: "Não encontrado" },
      });

      await expect(listar!()).rejects.toBeInstanceOf(ApiError);
    } finally {
      mock.restaurar();
    }
  });
});
