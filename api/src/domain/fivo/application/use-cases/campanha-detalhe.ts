import { TipoBeneficiada } from '@domain/fivo/entities/beneficiada';
import { Campanha, CampanhaStatus } from '@domain/fivo/entities/campanha';
import { Compromisso } from '@domain/fivo/entities/compromisso';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { Vigencia } from '@domain/fivo/entities/vigencia';

// Detalhe de uma campanha para a empresa dona: valores em string decimal e
// datas de vigência em AAAA-MM-DD. Usado pela edição (T19) e pela consulta
// da empresa (T21).

export interface CampanhaDetalheRegraDoacao {
  tipo: TipoRegraDoacao;
  valor?: string;
  percentual?: string;
}

export interface CampanhaDetalheVigencia {
  inicio: string;
  fim?: string;
}

export interface CampanhaDetalheCompromisso {
  beneficiada: { tipo: TipoBeneficiada; id: string };
  regraDoacao: CampanhaDetalheRegraDoacao;
  vigencia: CampanhaDetalheVigencia;
}

export interface CampanhaDetalhe {
  id: string;
  idPublico: string;
  nome: string;
  descricao: string | null;
  capaArquivoId: string | null;
  beneficiada: { tipo: TipoBeneficiada; id: string } | null;
  regraDoacao: CampanhaDetalheRegraDoacao | null;
  meta: string | null;
  vigencia: CampanhaDetalheVigencia | null;
  status: CampanhaStatus;
  submetidaEm: Date | null;
  motivoUltimaRejeicao: string | null;
  alteracaoPendente: (CampanhaDetalheCompromisso & { criadaEm: Date }) | null;
}

function paraDecimal(centesimos: number): string {
  const inteira = Math.floor(centesimos / 100);
  const fracao = String(centesimos % 100).padStart(2, '0');
  return `${inteira}.${fracao}`;
}

function descreverRegra(regra: RegraDoacao): CampanhaDetalheRegraDoacao {
  return {
    tipo: regra.tipo,
    ...(regra.valor && { valor: paraDecimal(regra.valor.centavos) }),
    ...(regra.percentual && {
      percentual: paraDecimal(regra.percentual.percentual),
    }),
  };
}

function descreverVigencia(vigencia: Vigencia): CampanhaDetalheVigencia {
  return {
    inicio: vigencia.inicio.toString(),
    ...(vigencia.fim && { fim: vigencia.fim.toString() }),
  };
}

export function descreverCompromisso(
  compromisso: Compromisso,
): CampanhaDetalheCompromisso {
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
          criadaEm: alteracao.createdAt,
        }
      : null,
  };
}
