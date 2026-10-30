// Testes do serviço da fila de campanhas do admin (web/src/services/admin.ts),
// vitrine-e-selo T42. Usam o `request` de verdade com o fetch simulado, para
// conferir a requisição que sai e a conversão do 409 em ApiError.

import { describe, it, expect, beforeEach } from "vitest";

import { ApiError } from "@/services/api";
import {
  aprovarAlteracao,
  aprovarCampanha,
  listarFilaCampanhas,
  rejeitarAlteracao,
  rejeitarCampanha,
  type ItemFilaCampanha,
} from "@/services/admin";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

const MOTIVO = "A regra de doação não está clara para o consumidor.";

const fila: ItemFilaCampanha[] = [
  {
    campanhaId: "camp-2",
    tipo: "NOVA",
    empresa: "Café Serra Verde",
    nome: "Água Limpa",
    beneficiada: { tipo: "INSTITUICAO", nome: "Instituto Verde" },
    regraDoacao: { tipo: "POR_UNIDADE", valor: "1.00" },
    vigencia: { inicio: "2026-11-01", fim: "2027-01-31" },
    submetidoEm: "2026-10-28T12:00:00.000Z",
  },
  {
    campanhaId: "camp-1",
    tipo: "ALTERACAO",
    empresa: "Padaria Sol",
    nome: "Pão Solidário",
    beneficiada: { tipo: "CAUSA", nome: "Educação" },
    regraDoacao: { tipo: "PERCENTUAL", percentual: "2.50" },
    vigencia: { inicio: "2026-10-01" },
    submetidoEm: "2026-10-29T09:00:00.000Z",
  },
];

let mock: MockFetch;

beforeEach(() => {
  mock = instalarMockFetch();
});

describe("listarFilaCampanhas", () => {
  it("faz GET em /api/admin/campanhas/fila e devolve os itens na ordem da API", async () => {
    mock.responderCom({ status: 200, body: fila });

    const itens = await listarFilaCampanhas();

    expect(mock.chamadas).toHaveLength(1);
    expect(mock.ultimaChamada().url).toBe("/api/admin/campanhas/fila");
    expect(mock.ultimaChamada().method).toBe("GET");
    expect(itens).toEqual(fila);
  });
});

describe.each([
  ["aprovarCampanha", aprovarCampanha, "/api/admin/campanhas/camp-1/aprovacao"],
  ["aprovarAlteracao", aprovarAlteracao, "/api/admin/campanhas/camp-1/alteracao/aprovacao"],
])("%s", (_nome, aprovar, url) => {
  it(`faz POST em ${url} sem corpo`, async () => {
    mock.responderCom({ status: 204 });

    await expect(aprovar("camp-1")).resolves.toBeUndefined();

    expect(mock.ultimaChamada().url).toBe(url);
    expect(mock.ultimaChamada().method).toBe("POST");
    expect(mock.ultimaChamada().body).toBeUndefined();
  });

  it("transforma o 409 em ApiError com status e mensagem da API", async () => {
    mock.responderCom({
      status: 409,
      body: { statusCode: 409, message: "Operação não permitida para o estado atual" },
    });

    const erro = await aprovar("camp-1").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(409);
    expect((erro as ApiError).message).toBe("Operação não permitida para o estado atual");
  });
});

describe.each([
  ["rejeitarCampanha", rejeitarCampanha, "/api/admin/campanhas/camp-1/rejeicao"],
  ["rejeitarAlteracao", rejeitarAlteracao, "/api/admin/campanhas/camp-1/alteracao/rejeicao"],
])("%s", (_nome, rejeitar, url) => {
  it(`faz POST em ${url} com o corpo { motivo } em JSON`, async () => {
    mock.responderCom({ status: 204 });

    await expect(rejeitar("camp-1", MOTIVO)).resolves.toBeUndefined();

    const chamada = mock.ultimaChamada();
    expect(chamada.url).toBe(url);
    expect(chamada.method).toBe("POST");
    expect(new Headers(chamada.init.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(chamada.body as string)).toEqual({ motivo: MOTIVO });
  });

  it("transforma o 409 em ApiError com status e mensagem da API", async () => {
    mock.responderCom({
      status: 409,
      body: { statusCode: 409, message: "Operação não permitida para o estado atual" },
    });

    const erro = await rejeitar("camp-1", MOTIVO).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(409);
    expect((erro as ApiError).message).toBe("Operação não permitida para o estado atual");
  });
});
