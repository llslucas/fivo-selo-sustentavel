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
  // Id da beneficiada escolhida, seja instituição ou causa; o tipo diz em qual
  // campo de POST /campanhas ele vai.
  instituicaoId: string | null;
  beneficiadaTipo: TipoBeneficiada | null;
  beneficiadaNome: string | null;
  regraTipo: RegraTipo;
  regraValor: string;
  meta: string;
  // AAAA-MM-DD, como sai do campo de data.
  vigenciaInicio: string;
  vigenciaFim: string;
  capa: File | null;
  logoFile: File | null;
  logoPreviewUrl: string | null;
  mostrarValorNoSelo: boolean;
  vincularCampanha: boolean;
  razaoSocial?: string;
  cnpj?: string;
  emailEmpresa?: string;
  telefoneEmpresa?: string;
};

export const initialWizardData: CampaignWizardData = {
  nome: "",
  descricao: "",
  instituicaoId: null,
  beneficiadaTipo: null,
  beneficiadaNome: null,
  regraTipo: "valor_fixo",
  regraValor: "",
  meta: "",
  vigenciaInicio: "",
  vigenciaFim: "",
  capa: null,
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
