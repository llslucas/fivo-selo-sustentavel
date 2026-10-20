import type { Beneficiada, TipoBeneficiada } from "@/services/instituicoes";

// Reexporta o contrato canônico de API servido por GET /beneficiadas.
export type { Beneficiada, TipoBeneficiada };

export type AvatarColor = "mint" | "peach" | "lavender";

// Alias mantido para compatibilidade com os módulos que ainda referenciam
// `Instituicao`; `Beneficiada` é a fonte canônica do formato de API.
export type Instituicao = Beneficiada;

export type RegraTipo = "valor_fixo" | "percentual";

export type CampaignWizardData = {
  nome: string;
  descricao: string;
  instituicaoId: string | null;
  regraTipo: RegraTipo;
  regraValor: string; 
  logoFile: File | null;
  logoPreviewUrl: string | null;
  mostrarValorNoSelo: boolean;
  vincularCampanha: boolean;
  razaoSocial?: string;
  cnpj?: string;
  emailEmpresa?: string;
  telefoneEmpresa?: string;
  modeloSelo?: string;
};

export const initialWizardData: CampaignWizardData = {
  nome: "",
  descricao: "",
  instituicaoId: null,
  regraTipo: "valor_fixo",
  regraValor: "",
  logoFile: null,
  logoPreviewUrl: null,
  mostrarValorNoSelo: true,
  vincularCampanha: true,
};

export const mockEmpresaAtual = {
  nome: "Café Serra Verde",
  iniciais: "SV",
  avatarColor: "mint" as AvatarColor,
};
