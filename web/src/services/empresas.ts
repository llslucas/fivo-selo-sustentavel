// Funções específicas do recurso "empresas" — cadastro e dados da empresa
// autenticada. Usa o cliente genérico de services/api.ts.

import { request } from "./api";

export type CriarEmpresaInput = {
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
  contato: string;
  site?: string;
  logo?: File | null;
};

export function criarEmpresa(input: CriarEmpresaInput): Promise<{ id: string }> {
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
  formData.append("contato", input.contato);
  if (input.site) formData.append("site", input.site);
  if (input.logo) formData.append("logo", input.logo);

  // Sem Content-Type manual: o browser define o boundary do multipart sozinho.
  return request("/empresas", { method: "POST", body: formData });
}

export type EmpresaAtual = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  emailPendente: string | null;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  site: string | null;
  contato: string;
  status: string;
  logoArquivoId: string | null;
  criadoEm: string;
};

export function getEmpresaAtual(): Promise<EmpresaAtual> {
  return request("/empresas/me");
}
