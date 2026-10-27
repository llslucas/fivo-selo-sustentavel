import { Either, left, right } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import {
  Beneficiada,
  TipoBeneficiada,
} from '@domain/fivo/entities/beneficiada';
import { CampanhaStatus } from '@domain/fivo/entities/campanha';
import { Compromisso } from '@domain/fivo/entities/compromisso';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { Vigencia } from '@domain/fivo/entities/vigencia';
import { Injectable } from '@nestjs/common';
import { CampanhaRepository } from '../ports/database/campanha-repository';

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

export interface AlteracaoPendenteDetalhe {
  beneficiada: BeneficiadaDetalhe;
  regraDoacao: RegraDoacaoDetalhe;
  vigencia: VigenciaDetalhe;
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

export interface ConsultarCampanhaDaEmpresaUseCaseRequest {
  empresaId: string;
  campanhaId: string;
}

export type ConsultarCampanhaDaEmpresaUseCaseResponse = Either<
  ResourceNotFoundError,
  CampanhaDetalhe
>;

// Centavos e centésimos de ponto viram texto sem passar por número decimal.
function paraDecimal(centesimos: number): string {
  const inteira = Math.floor(centesimos / 100);
  const fracao = String(centesimos % 100).padStart(2, '0');
  return `${inteira}.${fracao}`;
}

function beneficiadaDetalhe(beneficiada: Beneficiada): BeneficiadaDetalhe {
  return { tipo: beneficiada.tipo, id: beneficiada.id };
}

function regraDoacaoDetalhe(regraDoacao: RegraDoacao): RegraDoacaoDetalhe {
  return {
    tipo: regraDoacao.tipo,
    valor: regraDoacao.valor
      ? paraDecimal(regraDoacao.valor.centavos)
      : undefined,
    percentual: regraDoacao.percentual
      ? paraDecimal(regraDoacao.percentual.percentual)
      : undefined,
  };
}

function vigenciaDetalhe(vigencia: Vigencia): VigenciaDetalhe {
  return {
    inicio: vigencia.inicio.toString(),
    fim: vigencia.fim?.toString(),
  };
}

function compromissoDetalhe(compromisso: Compromisso) {
  return {
    beneficiada: beneficiadaDetalhe(compromisso.beneficiada),
    regraDoacao: regraDoacaoDetalhe(compromisso.regraDoacao),
    vigencia: vigenciaDetalhe(compromisso.vigencia),
  };
}

@Injectable()
export class ConsultarCampanhaDaEmpresaUseCase {
  constructor(private readonly campanhaRepository: CampanhaRepository) {}

  // Leitura não exige empresa aprovada: uma empresa pendente ou suspensa
  // continua vendo as próprias campanhas.
  async execute({
    empresaId,
    campanhaId,
  }: ConsultarCampanhaDaEmpresaUseCaseRequest): Promise<ConsultarCampanhaDaEmpresaUseCaseResponse> {
    const campanha = await this.campanhaRepository.findById(campanhaId);

    // Campanha de outra empresa responde igual à inexistente, para não revelar
    // que ela existe.
    if (!campanha || campanha.empresaId.toString() !== empresaId) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const alteracao = campanha.alteracaoPendente;

    const detalhe: CampanhaDetalhe = {
      id: campanha.id.toString(),
      idPublico: campanha.idPublico.toString(),
      nome: campanha.nome.valor,
      descricao: campanha.descricao?.valor ?? null,
      capaArquivoId: campanha.capaArquivoId?.toString() ?? null,
      beneficiada: campanha.beneficiada
        ? beneficiadaDetalhe(campanha.beneficiada)
        : null,
      regraDoacao: campanha.regraDoacao
        ? regraDoacaoDetalhe(campanha.regraDoacao)
        : null,
      meta: campanha.meta ? paraDecimal(campanha.meta.centavos) : null,
      vigencia: campanha.vigencia ? vigenciaDetalhe(campanha.vigencia) : null,
      status: campanha.status,
      submetidaEm: campanha.submetidaEm ?? null,
      motivoUltimaRejeicao: campanha.motivoUltimaRejeicao ?? null,
      alteracaoPendente: alteracao
        ? {
            ...compromissoDetalhe(alteracao.proposto),
            abertaEm: alteracao.createdAt,
          }
        : null,
      criadaEm: campanha.createdAt,
      atualizadaEm: campanha.updatedAt ?? null,
    };

    return right(detalhe);
  }
}
