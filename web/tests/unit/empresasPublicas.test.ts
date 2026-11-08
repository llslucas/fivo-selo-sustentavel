import { describe, it, expect, beforeEach } from "vitest";

import {
  listarParceiros,
  buscarEmpresaPublica,
  urlDoLogo,
  type EmpresaPublica,
  type ParceiroResumo,
} from "@/services/empresasPublicas";
import { ApiError } from "@/services/api";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";

describe("empresasPublicas", () => {
  let mock: MockFetch;

  beforeEach(() => {
    mock = instalarMockFetch();
  });

  it("listarParceiros chama GET /empresas/publicas e devolve a lista", async () => {
    const parceiros: ParceiroResumo[] = [
      { slug: "cafe-serra-verde", nomeFantasia: "Café Serra Verde", cidade: "Campinas", uf: "SP", temLogo: true },
    ];
    mock.responderPara("/empresas/publicas", { status: 200, body: parceiros });

    const resultado = await listarParceiros();

    expect(resultado).toEqual(parceiros);
    assertContrato(mock.ultimaChamada(), { metodo: "GET", rota: "/empresas/publicas" });
  });

  it("buscarEmpresaPublica chama GET /empresas/publicas/{slug} e mapeia o 200", async () => {
    const empresa: EmpresaPublica = {
      slug: "cafe-serra-verde",
      nomeFantasia: "Café Serra Verde",
      cidade: "Campinas",
      uf: "SP",
      site: "https://cafeserraverde.com.br",
      temLogo: true,
      campanhas: [
        {
          slug: "agua-limpa",
          nome: "Água Limpa",
          descricao: "texto",
          beneficiada: { tipo: "INSTITUICAO", nome: "Instituto X" },
          regraDoacao: { tipo: "POR_UNIDADE", valor: "1.00" },
          vigencia: { inicio: "2026-11-01", fim: "2027-01-31" },
          situacao: "EM_ANDAMENTO",
        },
      ],
    };
    mock.responderPara("/empresas/publicas/cafe-serra-verde", { status: 200, body: empresa });

    const resultado = await buscarEmpresaPublica("cafe-serra-verde");

    expect(resultado).toEqual(empresa);
    assertContrato(mock.ultimaChamada(), {
      metodo: "GET",
      rota: "/empresas/publicas/cafe-serra-verde",
    });
  });

  it("buscarEmpresaPublica rejeita com ApiError 404 quando a API responde 404", async () => {
    mock.responderPara("/empresas/publicas/inexistente", {
      status: 404,
      body: { statusCode: 404, message: "Empresa não encontrada" },
    });

    await expect(buscarEmpresaPublica("inexistente")).rejects.toBeInstanceOf(ApiError);
    await expect(buscarEmpresaPublica("inexistente")).rejects.toMatchObject({ status: 404 });
  });

  it("urlDoLogo monta a URL pública do logo com o prefixo /api", () => {
    expect(urlDoLogo("cafe-serra-verde")).toBe("/api/empresas/publicas/cafe-serra-verde/logo");
  });
});
