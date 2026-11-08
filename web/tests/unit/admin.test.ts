// Testes de exemplo do Servico_Admin — parte de empresas (web/src/services/admin.ts).
//
// Cobrem o "wiring" HTTP das três funções de empresa (listar/aprovar/rejeitar),
// espelhando os testes de serviço já existentes (ex.: empresas.test.ts,
// causas.contrato.test.ts), mas aqui com o cliente genérico `request` mockado
// via vi.mock. Isso isola o contrato do serviço (rota, método e corpo) do
// comportamento do fetch/Cliente_HTTP, que já é testado em api.test.ts.
//
// admin.ts importa apenas `request` de "@/services/api"; mockamos esse módulo
// com um `request` fake que registra cada chamada e devolve o valor desejado.
//
// Task 1.2 — fila-empresas-pendentes-admin
// _Requirements: 1.2, 1.3, 2.1, 2.2, 3.1, 3.2_

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock do cliente HTTP genérico: `request` vira um vi.fn controlável por teste.
// Hoisted para que a referência exista quando o vi.mock (içado) for avaliado.
const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock("@/services/api", () => ({
  request: requestMock,
}));

import {
  listarFilaEmpresas,
  aprovarEmpresa,
  rejeitarEmpresa,
  type ItemFilaEmpresa,
} from "@/services/admin";

beforeEach(() => {
  requestMock.mockReset();
});

// Fixture de uma empresa pendente, com overrides opcionais.
function empresa(parcial: Partial<ItemFilaEmpresa> = {}): ItemFilaEmpresa {
  return {
    id: "emp-1",
    razaoSocial: "Empresa Alfa LTDA",
    cnpj: "11222333000181",
    email: "contato@alfa.com",
    criadoEm: "2026-10-20T12:00:00.000Z",
    ...parcial,
  };
}

describe("Servico_Admin (admin.ts) — fila de empresas", () => {
  // _Requirements: 1.2, 1.3_
  // listarFilaEmpresas faz GET em /admin/empresas e devolve a lista na ordem
  // exata recebida da API (sem reordenar nem filtrar).
  it("listarFilaEmpresas faz GET em /admin/empresas e preserva a ordem recebida", async () => {
    const recebidas: ItemFilaEmpresa[] = [
      empresa({ id: "emp-3", razaoSocial: "Gamma" }),
      empresa({ id: "emp-1", razaoSocial: "Alfa" }),
      empresa({ id: "emp-2", razaoSocial: "Beta" }),
    ];
    requestMock.mockResolvedValueOnce(recebidas);

    const resultado = await listarFilaEmpresas();

    // Uma única chamada GET à rota da fila. O GET é implícito: o serviço não
    // passa `init`, então `request` é chamado só com o path (default GET).
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith("/admin/empresas");
    const init = requestMock.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.method ?? "GET").toBe("GET");

    // A lista volta exatamente como veio da API, na mesma ordem.
    expect(resultado).toBe(recebidas);
    expect(resultado.map((e) => e.id)).toEqual(["emp-3", "emp-1", "emp-2"]);
  });

  // _Requirements: 2.1, 2.2_
  // aprovarEmpresa(id) faz POST em /admin/empresas/{id}/aprovacao e resolve
  // sem conteúdo (a API responde 204 → request resolve undefined).
  it("aprovarEmpresa faz POST em /admin/empresas/{id}/aprovacao e resolve sem conteúdo", async () => {
    requestMock.mockResolvedValueOnce(undefined);

    const resultado = await aprovarEmpresa("emp-42");

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith("/admin/empresas/emp-42/aprovacao", {
      method: "POST",
    });
    // Sem corpo na aprovação e nenhum conteúdo resolvido.
    const init = requestMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect(resultado).toBeUndefined();
  });

  // _Requirements: 3.1, 3.2_
  // rejeitarEmpresa(id, motivo) faz POST em /admin/empresas/{id}/rejeicao com
  // corpo JSON { motivo } e Content-Type application/json, resolvendo sem conteúdo.
  it("rejeitarEmpresa faz POST em /admin/empresas/{id}/rejeicao com corpo { motivo } e resolve sem conteúdo", async () => {
    requestMock.mockResolvedValueOnce(undefined);

    const motivo = "Documentação incompleta para análise.";
    const resultado = await rejeitarEmpresa("emp-7", motivo);

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith("/admin/empresas/emp-7/rejeicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });

    // O corpo serializa exatamente { motivo } (round-trip de forma).
    const init = requestMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ motivo });
    expect(resultado).toBeUndefined();
  });
});
