export type AvatarColor = "mint" | "peach" | "lavender";

export type Instituicao = {
  id: string;
  nome: string;
  cidade: string;
  descricao: string;
};

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
