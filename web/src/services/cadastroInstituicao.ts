// Cadastro de instituição (POST /instituicoes). Fica separado de
// services/instituicoes.ts, que é do catálogo de beneficiadas.
// Usa o cliente genérico de services/api.ts.

import { request } from "./api";

export type CriarInstituicaoInput = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  senha: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  site: string;
  contato: string;
  causaId: string;
  descricao: string;
  documento: File;
  descricaoDocumento?: string;
  logo?: File | null;
};

export function criarInstituicao(input: CriarInstituicaoInput): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("razaoSocial", input.razaoSocial);
  formData.append("nomeFantasia", input.nomeFantasia);
  formData.append("cnpj", input.cnpj);
  formData.append("email", input.email);
  formData.append("senha", input.senha);
  formData.append("telefone", input.telefone);
  formData.append("cep", input.cep);
  formData.append("logradouro", input.logradouro);
  formData.append("numero", input.numero);
  if (input.complemento) formData.append("complemento", input.complemento);
  formData.append("bairro", input.bairro);
  formData.append("cidade", input.cidade);
  formData.append("uf", input.uf);
  formData.append("site", input.site);
  formData.append("contato", input.contato);
  formData.append("causaId", input.causaId);
  formData.append("descricao", input.descricao);
  formData.append("documento", input.documento);
  if (input.descricaoDocumento) formData.append("descricaoDocumento", input.descricaoDocumento);
  if (input.logo) formData.append("logo", input.logo);

  // Sem Content-Type manual: o browser define o boundary do multipart sozinho.
  return request("/instituicoes", { method: "POST", body: formData });
}