// Testes de unidade do serviço de campanhas (web/src/services/campanhas.ts):
// lista da área da empresa (GET /campanhas) e download do selo
// (GET /campanhas/{id}/selo). Contratos em vitrine-e-selo/design.md.

import { describe, it, expect, vi } from "vitest";

import { baixarSelo, listarCampanhas, type CampanhaResumo } from "@/services/campanhas";
import { ApiError } from "@/services/api";
import { instalarMockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";

const campanhas: CampanhaResumo[] = [
  {
    id: "camp-2",
    nome: "Água Limpa",
    status: "APROVADA",
    regraDoacao: { tipo: "POR_UNIDADE", valor: "1.00" },
    urlPublica: "https://fivo.example/empresa/cafe-serra-verde/agua-limpa",
  },
  {
    id: "camp-1",
    nome: "Escola Viva",
    status: "RASCUNHO",
    regraDoacao: null,
    urlPublica: null,
  },
];

// O selo é um arquivo SVG: o mockFetch do projeto só simula JSON, então aqui
// o fetch devolve uma Response de verdade.
function responderSelo(resposta: Response) {
  const fetchMock = vi.fn(() => Promise.resolve(resposta));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("listarCampanhas", () => {
  it("faz GET /campanhas e devolve a lista na ordem recebida", async () => {
    const mock = instalarMockFetch();
    mock.responderCom({ status: 200, body: campanhas });

    const resultado = await listarCampanhas();

    assertContrato(mock.ultimaChamada(), { metodo: "GET", rota: "/campanhas" });
    expect(mock.ultimaChamada().url).toBe("/api/campanhas");
    expect(resultado).toEqual(campanhas);
  });

  it.each([403, 404, 409])("transforma a resposta %i em ApiError com o status", async (status) => {
    const mock = instalarMockFetch();
    mock.responderCom({ status, body: { statusCode: status, message: "Erro da API" } });

    const erro = await listarCampanhas().catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(status);
    expect((erro as ApiError).message).toBe("Erro da API");
  });
});

describe("baixarSelo", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

  it("faz GET /campanhas/{id}/selo com o cookie e devolve o arquivo e o nome do Content-Disposition", async () => {
    const fetchMock = responderSelo(
      new Response(svg, {
        status: 200,
        headers: {
          "content-type": "image/svg+xml",
          "content-disposition": 'attachment; filename="selo-agua-limpa.svg"',
        },
      }),
    );

    const selo = await baixarSelo("camp-2");

    expect(fetchMock).toHaveBeenCalledWith("/api/campanhas/camp-2/selo", {
      credentials: "include",
    });
    expect(selo.nomeArquivo).toBe("selo-agua-limpa.svg");
    expect(await selo.arquivo.text()).toBe(svg);
  });

  it("usa selo.svg quando a resposta não traz Content-Disposition", async () => {
    responderSelo(
      new Response(svg, { status: 200, headers: { "content-type": "image/svg+xml" } }),
    );

    const selo = await baixarSelo("camp-2");

    expect(selo.nomeArquivo).toBe("selo.svg");
  });

  it.each([
    [403, "Acesso negado"],
    [404, "Campanha não encontrada"],
    [409, "Campanha não está aprovada"],
  ])("transforma a resposta %i em ApiError com o status e a mensagem", async (status, mensagem) => {
    responderSelo(
      new Response(JSON.stringify({ statusCode: status, message: mensagem }), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );

    const erro = await baixarSelo("camp-1").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(status);
    expect((erro as ApiError).message).toBe(mensagem);
  });

  it("transforma falha de rede em ApiError com status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));

    const erro = await baixarSelo("camp-2").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(0);
  });
});
