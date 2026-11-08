// Testes de criar, enviar capa e submeter campanha (web/src/services/campanhas.ts),
// vitrine-e-selo T37: rota, método e corpo de cada chamada.

import { describe, it, expect, beforeEach } from "vitest";

import { ApiError } from "@/services/api";
import {
  criarCampanha,
  enviarCapa,
  submeterCampanha,
  type NovaCampanha,
} from "@/services/campanhas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";

let mock: MockFetch;

beforeEach(() => {
  mock = instalarMockFetch();
});

describe("criarCampanha", () => {
  it("faz POST /campanhas com os campos em JSON e devolve id e idPublico", async () => {
    const dados: NovaCampanha = {
      nome: "Água Limpa",
      descricao: "Cada pacote vendido ajuda o instituto.",
      instituicaoId: "inst-1",
      regraDoacao: { tipo: "POR_UNIDADE", valor: "1.50" },
      meta: "5000.00",
      vigencia: { inicio: "2026-11-01", fim: "2027-01-31" },
    };
    mock.responderCom({ status: 201, body: { id: "camp-1", idPublico: "pub-1" } });

    const criada = await criarCampanha(dados);

    assertContrato(mock.ultimaChamada(), {
      metodo: "POST",
      rota: "/campanhas",
      corpoJson: dados,
      contentType: "application/json",
    });
    expect(criada).toEqual({ id: "camp-1", idPublico: "pub-1" });
  });

  it("envia só o nome quando é o único campo preenchido", async () => {
    mock.responderCom({ status: 201, body: { id: "camp-1", idPublico: "pub-1" } });

    await criarCampanha({ nome: "Rascunho" });

    expect(JSON.parse(mock.ultimaChamada().body as string)).toEqual({ nome: "Rascunho" });
  });

  it("transforma o 422 em ApiError com a mensagem da API", async () => {
    mock.responderCom({
      status: 422,
      body: { statusCode: 422, message: "Instituição ou causa indisponível" },
    });

    const erro = await criarCampanha({ nome: "X" }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(422);
    expect((erro as ApiError).message).toBe("Instituição ou causa indisponível");
  });
});

describe("enviarCapa", () => {
  it("faz PUT /campanhas/{id}/capa em multipart/form-data com o arquivo no campo capa", async () => {
    const capa = new File(["imagem"], "capa.png", { type: "image/png" });
    mock.responderCom({ status: 204 });

    await expect(enviarCapa("camp-1", capa)).resolves.toBeUndefined();

    const chamada = mock.ultimaChamada();
    assertContrato(chamada, {
      metodo: "PUT",
      rota: "/campanhas/camp-1/capa",
      corpoFormData: { capa },
      semContentTypeManual: true,
    });
    expect(chamada.body).toBeInstanceOf(FormData);
  });
});

describe("submeterCampanha", () => {
  it("faz POST /campanhas/{id}/submissao sem corpo", async () => {
    mock.responderCom({ status: 204 });

    await expect(submeterCampanha("camp-1")).resolves.toBeUndefined();

    assertContrato(mock.ultimaChamada(), { metodo: "POST", rota: "/campanhas/camp-1/submissao" });
    expect(mock.ultimaChamada().body).toBeUndefined();
  });

  it("transforma o 422 de campos pendentes em ApiError", async () => {
    mock.responderCom({
      status: 422,
      body: {
        statusCode: 422,
        message: "Preencha os campos obrigatórios antes de enviar para análise",
      },
    });

    const erro = await submeterCampanha("camp-1").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(422);
  });
});
