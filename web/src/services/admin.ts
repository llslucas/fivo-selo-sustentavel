// Funções específicas do recurso "admin" — filas e decisões do administrador.
// Usa o cliente genérico de services/api.ts.

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