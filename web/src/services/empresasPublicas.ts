import { request } from "./api";
export type ParceiroResumo = {
  slug: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  temLogo: boolean;
};

export type RegraDoacaoPublica =
  | { tipo: "POR_UNIDADE"; valor: string }
  | { tipo: "PERCENTUAL"; percentual: string };

export type CampanhaPublica = {
  slug: string;
  nome: string;
  descricao: string;
  beneficiada: { tipo: "INSTITUICAO" | "CAUSA"; nome: string };
  regraDoacao: RegraDoacaoPublica;
  vigencia: { inicio: string; fim?: string };
  situacao: "NAO_INICIADA" | "EM_ANDAMENTO";
};

export type EmpresaPublica = {
  slug: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  site: string;
  temLogo: boolean;
  campanhas: CampanhaPublica[];
};
export function listarParceiros(): Promise<ParceiroResumo[]> {
  return request("/empresas/publicas");
}

export function buscarEmpresaPublica(slug: string): Promise<EmpresaPublica> {
  return request(`/empresas/publicas/${encodeURIComponent(slug)}`);
}

export function urlDoLogo(slug: string): string {
  return `/api/empresas/publicas/${encodeURIComponent(slug)}/logo`;
}
