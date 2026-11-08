import type { NovaCampanha } from "@/services/campanhas";
import type { CampaignWizardData } from "./types";

// Monta o corpo de POST /campanhas com o que foi preenchido no wizard. Campo
// vazio fica de fora, para o rascunho poder ser salvo só com o nome.
export function montarNovaCampanha(data: CampaignWizardData): NovaCampanha {
  const nova: NovaCampanha = { nome: data.nome.trim() };

  const descricao = data.descricao.trim();
  if (descricao) nova.descricao = descricao;

  if (data.instituicaoId) {
    if (data.beneficiadaTipo === "CAUSA") nova.causaId = data.instituicaoId;
    else nova.instituicaoId = data.instituicaoId;
  }

  const valor = data.regraValor.trim();
  if (valor) {
    nova.regraDoacao =
      data.regraTipo === "valor_fixo"
        ? { tipo: "POR_UNIDADE", valor }
        : { tipo: "PERCENTUAL", percentual: valor };
  }

  const meta = data.meta.trim();
  if (meta) nova.meta = meta;

  if (data.vigenciaInicio) {
    nova.vigencia = data.vigenciaFim
      ? { inicio: data.vigenciaInicio, fim: data.vigenciaFim }
      : { inicio: data.vigenciaInicio };
  }

  return nova;
}
