// Testes de serviços de catálogo: `instituicoes.ts` (já existente) e
// `campanhas.ts` (ainda opcional/condicional) — Requisitos 7.1, 7.2.
//
// ESTADO ATUAL:
// - `web/src/services/instituicoes.ts` JÁ EXISTE: o bloco "instituicoes" abaixo
//   importa e exercita diretamente `listarBeneficiadas`, afirmando o contrato
//   real (GET /beneficiadas via fetch mockado) e a propagação de `ApiError`.
// - `web/src/services/campanhas.ts` AINDA NÃO EXISTE (será criado em tasks
//   futuras). Por isso, seu bloco continua usando
//   `describe.skipIf(!servicoExiste("campanhas.ts"))`: enquanto o módulo não
//   existir, o bloco inteiro é PULADO de forma limpa e a suíte permanece verde.
//   Quando o arquivo passar a existir, os testes passam a rodar automaticamente
//   e seus corpos DEVEM ser revisados para afirmar a API realmente exportada.
//
// Toda resposta vem de dados controlados (fixtures inline) servidos pelo mock de
// `fetch`; nenhuma conexão real é estabelecida.

import { describe, it, expect } from "vitest";

import { importarSeExistir, servicoExiste } from "../helpers/moduleExists";
import { instalarMockFetch } from "../helpers/mockFetch";
import { ApiError } from "@/services/api";
import { listarBeneficiadas, type Beneficiada } from "@/services/instituicoes";

// Nomes convencionais de função de listagem/busca procurados no módulo
// `campanhas.ts` quando ele existir. Ajuste/estenda conforme a convenção
// adotada pelo serviço real.
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
// O serviço existe: exercitamos `listarBeneficiadas` diretamente contra o
// cliente HTTP real (`request`) com `fetch` mockado.
describe("instituicoes — listarBeneficiadas", () => {
  it("retorna o catálogo preservando todos os campos do contrato (200)", async () => {
    const catalogo: Beneficiada[] = [
      {
        tipo: "INSTITUICAO",
        id: "inst-1",
        nome: "Instituição Exemplo",
        causa: "Educação",
        cidade: "Recife",
        uf: "PE",
        descricao: "Apoio a crianças em idade escolar.",
        site: "https://exemplo.org",
        logoArquivoId: "arq-1",
      },
      {
        tipo: "CAUSA",
        id: "causa-1",
        nome: "Causa Exemplo",
        causa: null,
        cidade: null,
        uf: null,
        descricao: "Causa de interesse coletivo.",
        site: null,
        logoArquivoId: null,
      },
    ];

    const mock = instalarMockFetch();
    try {
      mock.responderCom({ status: 200, body: catalogo });

      const resultado = await listarBeneficiadas();

      // Sem termo de busca: requisita o catálogo completo em GET /beneficiadas.
      expect(resultado).toEqual(catalogo);
      expect(mock.ultimaChamada().method).toBe("GET");
      expect(mock.ultimaChamada().url).toBe("/api/beneficiadas");
    } finally {
      mock.restaurar();
    }
  });

  it("descarta itens sem id ou nome, preservando a ordem dos válidos", async () => {
    const bruto = [
      { tipo: "INSTITUICAO", id: "inst-1", nome: "Válida A", descricao: "A" },
      { tipo: "INSTITUICAO", id: "", nome: "Sem id", descricao: "B" },
      { tipo: "INSTITUICAO", id: "inst-2", nome: "", descricao: "C" },
      { tipo: "CAUSA", id: "causa-1", nome: "Válida B", descricao: "D" },
    ];

    const mock = instalarMockFetch();
    try {
      mock.responderCom({ status: 200, body: bruto });

      const resultado = await listarBeneficiadas();

      expect(resultado.map((item) => item.id)).toEqual(["inst-1", "causa-1"]);
    } finally {
      mock.restaurar();
    }
  });

  it("envia ?busca=<termo> quando o termo tem 2+ caracteres (após trim)", async () => {
    const mock = instalarMockFetch();
    try {
      mock.responderCom({ status: 200, body: [] });

      await listarBeneficiadas("  escola  ");

      expect(mock.ultimaChamada().url).toBe("/api/beneficiadas?busca=escola");
    } finally {
      mock.restaurar();
    }
  });

  it("não envia filtro quando o termo tem menos de 2 caracteres", async () => {
    const mock = instalarMockFetch();
    try {
      mock.responderCom({ status: 200, body: [] });

      await listarBeneficiadas("a");

      expect(mock.ultimaChamada().url).toBe("/api/beneficiadas");
    } finally {
      mock.restaurar();
    }
  });

  it("propaga ApiError em caso de falha (4xx/5xx), sem tratamento no serviço", async () => {
    const mock = instalarMockFetch();
    try {
      mock.responderCom({
        status: 500,
        body: { statusCode: 500, message: "Erro interno" },
      });

      await expect(listarBeneficiadas()).rejects.toBeInstanceOf(ApiError);
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
