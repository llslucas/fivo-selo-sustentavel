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
  regraValor: string; // mantido como string p/ o TextField controlado
  logoFile: File | null;
  logoPreviewUrl: string | null;
  mostrarValorNoSelo: boolean;
  vincularCampanha: boolean;
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

// Empresa "logada" — mockada por enquanto, até existir autenticação real.
export const mockEmpresaAtual = {
  nome: "Café Serra Verde",
  iniciais: "SV",
  avatarColor: "mint" as AvatarColor,
};
