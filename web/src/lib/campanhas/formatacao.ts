// Textos da campanha mostrados ao usuário (vitrine-e-selo, VIT-03 AC6 e AC7).
// Usados nos cards da área da empresa e na página pública.

import type { RegraDoacao, StatusCampanha } from "@/services/campanhas";

const DUAS_CASAS = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Percentual sem zeros sobrando: "2.50" vira "2,5" e "10.00" vira "10".
const ATE_DUAS_CASAS = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const ROTULOS_STATUS: Record<StatusCampanha, string> = {
  RASCUNHO: "Rascunho",
  EM_ANALISE: "Em análise",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
};

export function textoDoValor(regraDoacao: RegraDoacao | null): string {
  if (!regraDoacao) return "Regra de doação não definida";

  if (regraDoacao.tipo === "POR_UNIDADE") {
    return `R$ ${DUAS_CASAS.format(Number(regraDoacao.valor))} por unidade vendida`;
  }

  return `${ATE_DUAS_CASAS.format(Number(regraDoacao.percentual))}% de cada venda`;
}

export function rotuloDoStatus(status: StatusCampanha): string {
  return ROTULOS_STATUS[status];
}
