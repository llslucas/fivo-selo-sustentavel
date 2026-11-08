// Edição de campanha em /campanhas/{id} (vitrine-e-selo T36, VIT-11 AC3).
// Reaproveita os passos do wizard: o detalhe vira o estado do wizard, e o
// PATCH leva só o que mudou em relação ao que a campanha já tinha.

import { montarNovaCampanha } from "@/lib/campaign-wizard/payload";
import { initialWizardData, type CampaignWizardData } from "@/lib/campaign-wizard/types";
import type { CampanhaDetalhe, EdicaoCampanha, NovaCampanha } from "@/services/campanhas";

export function dadosDoWizard(
  campanha: CampanhaDetalhe,
  beneficiadaNome: string | null,
): CampaignWizardData {
  const regra = campanha.regraDoacao;

  return {
    ...initialWizardData,
    nome: campanha.nome,
    descricao: campanha.descricao ?? "",
    instituicaoId: campanha.beneficiada?.id ?? null,
    beneficiadaTipo: campanha.beneficiada?.tipo ?? null,
    beneficiadaNome,
    regraTipo: regra?.tipo === "PERCENTUAL" ? "percentual" : "valor_fixo",
    regraValor: regra ? (regra.tipo === "POR_UNIDADE" ? regra.valor : regra.percentual) : "",
    meta: campanha.meta ?? "",
    vigenciaInicio: campanha.vigencia?.inicio ?? "",
    vigenciaFim: campanha.vigencia?.fim ?? "",
  };
}

// Campo apagado no formulário fica de fora (o PATCH não limpa campo), como em
// `montarNovaCampanha`.
export function alteracoes(
  original: CampaignWizardData,
  editado: CampaignWizardData,
): EdicaoCampanha {
  const antes = montarNovaCampanha(original);
  const depois = montarNovaCampanha(editado);
  const mudou: EdicaoCampanha = {};

  for (const chave of Object.keys(depois) as (keyof NovaCampanha)[]) {
    if (JSON.stringify(depois[chave]) !== JSON.stringify(antes[chave])) {
      Object.assign(mudou, { [chave]: depois[chave] });
    }
  }

  return mudou;
}
