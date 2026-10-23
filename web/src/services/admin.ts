
import { request } from "./api";

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
