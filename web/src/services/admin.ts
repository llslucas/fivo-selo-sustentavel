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
