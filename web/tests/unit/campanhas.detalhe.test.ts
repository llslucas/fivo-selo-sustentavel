// Testes de detalhar e editar campanha (web/src/services/campanhas.ts),
// vitrine-e-selo T35: rota, método e corpo; 404 e 409 viram ApiError.

import { describe, it, expect, beforeEach } from "vitest";

import { ApiError } from "@/services/api";
import {
  detalharCampanha,
  editarCampanha,
  type CampanhaDetalhe,
} from "@/services/campanhas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";

let mock: MockFetch;

beforeEach(() => {
  mock = instalarMockFetch();
});

const detalhe: CampanhaDetalhe = {
  id: "camp-1",
  idPublico: "pub-1",
  nome: "Água Limpa",
  descricao: "Cada pacote vendido ajuda o instituto.",
  capaArquivoId: "arq-1",
  beneficiada: { tipo: "INSTITUICAO", id: "inst-1" },
  regraDoacao: { tipo: "POR_UNIDADE", valor: "1.50" },
  meta: "5000.00",
  vigencia: { inicio: "2026-11-01", fim: "2027-01-31" },
  status: "REJEITADA",
  submetidaEm: "2026-10-29T12:00:00.000Z",
  motivoUltimaRejeicao: "A descrição não explica como a doação é feita.",
  alteracaoPendente: null,
  criadaEm: "2026-10-28T12:00:00.000Z",
  atualizadaEm: "2026-10-30T12:00:00.000Z",
};

describe("detalharCampanha", () => {
  it("faz GET /campanhas/{id} e devolve o detalhe da campanha", async () => {
    mock.responderCom({ status: 200, body: detalhe });

    const recebido = await detalharCampanha("camp-1");

    assertContrato(mock.ultimaChamada(), { metodo: "GET", rota: "/campanhas/camp-1" });
    expect(recebido).toEqual(detalhe);
  });

  it("transforma o 404 em ApiError com a mensagem da API", async () => {
    mock.responderCom({
      status: 404,
      body: { statusCode: 404, message: "Campanha não encontrada" },
    });

    const erro = await detalharCampanha("camp-1").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(404);
    expect((erro as ApiError).message).toBe("Campanha não encontrada");
  });
});

describe("editarCampanha", () => {
  it("faz PATCH /campanhas/{id} com os campos em JSON e devolve o detalhe atualizado", async () => {
    const dados = {
      nome: "Água Limpa 2",
      descricao: "Cada pacote vendido doa R$ 1,50 ao instituto.",
      causaId: "causa-1",
      regraDoacao: { tipo: "PERCENTUAL", percentual: "2.50" } as const,
      meta: "8000.00",
      vigencia: { inicio: "2026-12-01" },
    };
    const atualizado: CampanhaDetalhe = {
      ...detalhe,
      ...dados,
      beneficiada: { tipo: "CAUSA", id: "causa-1" },
    };
    mock.responderCom({ status: 200, body: atualizado });

    const recebido = await editarCampanha("camp-1", dados);

    assertContrato(mock.ultimaChamada(), {
      metodo: "PATCH",
      rota: "/campanhas/camp-1",
      corpoJson: dados,
      contentType: "application/json",
    });
    expect(recebido).toEqual(atualizado);
  });

  it("envia só o campo editado", async () => {
    mock.responderCom({ status: 200, body: detalhe });

    await editarCampanha("camp-1", { descricao: "Nova descrição" });

    expect(JSON.parse(mock.ultimaChamada().body as string)).toEqual({
      descricao: "Nova descrição",
    });
  });

  it("transforma o 404 em ApiError", async () => {
    mock.responderCom({
      status: 404,
      body: { statusCode: 404, message: "Campanha não encontrada" },
    });

    const erro = await editarCampanha("camp-1", { nome: "X" }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(404);
    expect((erro as ApiError).message).toBe("Campanha não encontrada");
  });

  it("transforma o 409 de campanha em análise em ApiError com a mensagem da API", async () => {
    mock.responderCom({
      status: 409,
      body: { statusCode: 409, message: "Campanha em análise não pode ser editada" },
    });

    const erro = await editarCampanha("camp-1", { nome: "X" }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(409);
    expect((erro as ApiError).message).toBe("Campanha em análise não pode ser editada");
  });
});
