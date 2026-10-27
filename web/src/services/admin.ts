import { request } from "./api";

export const MOTIVO_REJEICAO_MINIMO = 20;

export type ItemFilaInstituicao = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  causa: string;
  cidade: string;
  uf: string;
  email: string;
  criadoEm: string;
  documentoArquivoId: string;
  documentoDisponivel: boolean;
  cnpjCoincideComEmpresa: boolean;
};

export function listarFilaInstituicoes(): Promise<ItemFilaInstituicao[]> {
  return request("/admin/instituicoes");
}

export function aprovarInstituicao(id: string): Promise<void> {
  return request(`/admin/instituicoes/${id}/aprovacao`, { method: "POST" });
}

export function rejeitarInstituicao(id: string, motivo: string): Promise<void> {
  return request(`/admin/instituicoes/${id}/rejeicao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });
}

export type ItemFilaEmpresa = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  criadoEm: string;
};

export function listarFilaEmpresas(): Promise<ItemFilaEmpresa[]> {
  return request("/admin/empresas");
}

export function aprovarEmpresa(id: string): Promise<void> {
  return request(`/admin/empresas/${id}/aprovacao`, { method: "POST" });
}

export function rejeitarEmpresa(id: string, motivo: string): Promise<void> {
  return request(`/admin/empresas/${id}/rejeicao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });
}

export type EstadoInstituicao = "APROVADA" | "SUSPENSA";

export type InstituicaoAprovada = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  causa: string;
  cidade: string;
  uf: string;
  email: string;
  estado: EstadoInstituicao;
};

export function listarInstituicoesAprovadas(): Promise<InstituicaoAprovada[]> {
  return request("/admin/instituicoes?estado=APROVADA");
}

export function suspenderInstituicao(id: string): Promise<void> {
  return request(`/admin/instituicoes/${id}/suspensao`, { method: "POST" });
}

export function reativarInstituicao(id: string): Promise<void> {
  return request(`/admin/instituicoes/${id}/reativacao`, { method: "POST" });
}

export function encerrarInstituicao(id: string): Promise<void> {
  return request(`/admin/instituicoes/${id}/inativacao`, { method: "POST" });
}
