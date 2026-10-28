import { TipoBeneficiada } from '@domain/fivo/entities/beneficiada';
import { Campanha, CampanhaStatus } from '@domain/fivo/entities/campanha';
import { Compromisso } from '@domain/fivo/entities/compromisso';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { Vigencia } from '@domain/fivo/entities/vigencia';

// Read model do detalhe de uma campanha para a empresa dona, devolvido pela
// edição (T19) e pela consulta da empresa (T21). Também define o retrato do
// compromisso usado na fila, na consulta pública e em toda auditoria de
// alteração: valores em string decimal e datas em AAAA-MM-DD.

export interface BeneficiadaDetalhe {
  tipo: TipoBeneficiada;
  id: string;
}

/** Valores em string decimal: `"1.50"` (R$) e `"12.50"` (%). */
export interface RegraDoacaoDetalhe {
  tipo: TipoRegraDoacao;
  valor?: string;
  percentual?: string;
}

/** Datas `AAAA-MM-DD`. */
export interface VigenciaDetalhe {
  inicio: string;
  fim?: string;
}

export interface CompromissoDetalhe {
  beneficiada: BeneficiadaDetalhe;
  regraDoacao: RegraDoacaoDetalhe;
  vigencia: VigenciaDetalhe;
}

export interface AlteracaoPendenteDetalhe extends CompromissoDetalhe {
  abertaEm: Date;
}

export interface CampanhaDetalhe {
  id: string;
  idPublico: string;
  nome: string;
  descricao: string | null;
  capaArquivoId: string | null;
  beneficiada: BeneficiadaDetalhe | null;
  regraDoacao: RegraDoacaoDetalhe | null;
  meta: string | null;
  vigencia: VigenciaDetalhe | null;
  status: CampanhaStatus;
  submetidaEm: Date | null;
  motivoUltimaRejeicao: string | null;
  /** Só os valores propostos; os atuais já estão nos campos acima. */
  alteracaoPendente: AlteracaoPendenteDetalhe | null;
  criadaEm: Date;
  atualizadaEm: Date | null;
}

// Centavos e centésimos de ponto viram texto sem passar por número decimal.
export function paraDecimal(centesimos: number): string {
  const inteira = Math.floor(centesimos / 100);
  const fracao = String(centesimos % 100).padStart(2, '0');
  return `${inteira}.${fracao}`;
}

export function descreverRegra(regra: RegraDoacao): RegraDoacaoDetalhe {
  return {
    tipo: regra.tipo,
    ...(regra.valor && { valor: paraDecimal(regra.valor.centavos) }),
    ...(regra.percentual && {
      percentual: paraDecimal(regra.percentual.percentual),
    }),
  };
}

export function descreverVigencia(vigencia: Vigencia): VigenciaDetalhe {
  return {
    inicio: vigencia.inicio.toString(),
    ...(vigencia.fim && { fim: vigencia.fim.toString() }),
  };
}

/** Retrato do compromisso em primitivos, igual em toda a feature. */
export function descreverCompromisso(
  compromisso: Compromisso,
): CompromissoDetalhe {
  return {
    beneficiada: {
      tipo: compromisso.beneficiada.tipo,
      id: compromisso.beneficiada.id,
    },
    regraDoacao: descreverRegra(compromisso.regraDoacao),
    vigencia: descreverVigencia(compromisso.vigencia),
  };
}

export function montarCampanhaDetalhe(campanha: Campanha): CampanhaDetalhe {
  const alteracao = campanha.alteracaoPendente;

  return {
    id: campanha.id.toString(),
    idPublico: campanha.idPublico.toString(),
    nome: campanha.nome.valor,
    descricao: campanha.descricao?.valor ?? null,
    capaArquivoId: campanha.capaArquivoId?.toString() ?? null,
    beneficiada: campanha.beneficiada
      ? { tipo: campanha.beneficiada.tipo, id: campanha.beneficiada.id }
      : null,
    regraDoacao: campanha.regraDoacao
      ? descreverRegra(campanha.regraDoacao)
      : null,
    meta: campanha.meta ? paraDecimal(campanha.meta.centavos) : null,
    vigencia: campanha.vigencia ? descreverVigencia(campanha.vigencia) : null,
    status: campanha.status,
    submetidaEm: campanha.submetidaEm ?? null,
    motivoUltimaRejeicao: campanha.motivoUltimaRejeicao ?? null,
    alteracaoPendente: alteracao
      ? {
          ...descreverCompromisso(alteracao.proposto),
          abertaEm: alteracao.createdAt,
        }
      : null,
    criadaEm: campanha.createdAt,
    atualizadaEm: campanha.updatedAt ?? null,
  };
}
