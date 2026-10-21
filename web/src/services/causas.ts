// Funções específicas do recurso "causas" — catálogo público de causas que uma
// instituição pode defender. Usa o cliente genérico de services/api.ts.

import { request } from "./api";

export type Causa = {
  id: string;
  nome: string;
  descricao: string;
};

export function listarCausas(): Promise<Causa[]> {
  return request("/causas");
}