import { request } from "./api";
import type { RegraDoacao } from "./campanhas";

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

export type TipoItemFilaCampanha = "NOVA" | "ALTERACAO";

// Na alteração, regra, beneficiada e vigência são os valores propostos, que é
// sobre o que o admin decide. Datas da vigência em AAAA-MM-DD.
export type ItemFilaCampanha = {
  campanhaId: string;
  tipo: TipoItemFilaCampanha;
  empresa: string;
  nome: string;
  beneficiada: { tipo: "INSTITUICAO" | "CAUSA"; nome: string };
  regraDoacao: RegraDoacao;
  vigencia: { inicio: string; fim?: string };
  submetidoEm: string;
};

// Da submissão (ou abertura da alteração) mais antiga para a mais recente.
export function listarFilaCampanhas(): Promise<ItemFilaCampanha[]> {
  return request("/admin/campanhas/fila");
}

export function aprovarCampanha(id: string): Promise<void> {
  return request(`/admin/campanhas/${id}/aprovacao`, { method: "POST" });
}

export function rejeitarCampanha(id: string, motivo: string): Promise<void> {
  return request(`/admin/campanhas/${id}/rejeicao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });
}

export function aprovarAlteracao(id: string): Promise<void> {
  return request(`/admin/campanhas/${id}/alteracao/aprovacao`, { method: "POST" });
}

export function rejeitarAlteracao(id: string, motivo: string): Promise<void> {
  return request(`/admin/campanhas/${id}/alteracao/rejeicao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motivo }),
  });
}
