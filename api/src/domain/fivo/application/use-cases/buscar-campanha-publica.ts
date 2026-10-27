import { Either, left, right } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import {
  Beneficiada,
  TipoBeneficiada,
} from '@domain/fivo/entities/beneficiada';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { TipoRegraDoacao } from '@domain/fivo/entities/regra-doacao';
import { Injectable } from '@nestjs/common';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { CausaRepository } from '../ports/database/causa-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';

export type SituacaoCampanha = 'NAO_INICIADA' | 'EM_ANDAMENTO';

export interface CampanhaPublica {
  nome: string;
  descricao: string | null;
  temCapa: boolean;
  empresa: string;
  beneficiada: { tipo: TipoBeneficiada; nome: string };
  regraDoacao: { tipo: TipoRegraDoacao; valor?: string; percentual?: string };
  meta: string | null;
  vigencia: { inicio: string; fim?: string };
  situacao: SituacaoCampanha;
}

export interface BuscarCampanhaPublicaUseCaseRequest {
  idPublico: string;
}

export type BuscarCampanhaPublicaUseCaseResponse = Either<
  ResourceNotFoundError,
  CampanhaPublica
>;

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function paraDecimal(centesimos: number): string {
  const inteira = Math.floor(centesimos / 100);
  const fracao = String(centesimos % 100).padStart(2, '0');
  return `${inteira}.${fracao}`;
}

@Injectable()
export class BuscarCampanhaPublicaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly causaRepository: CausaRepository,
  ) {}

  async execute({
    idPublico,
  }: BuscarCampanhaPublicaUseCaseRequest): Promise<BuscarCampanhaPublicaUseCaseResponse> {
    if (!FORMATO_UUID.test(idPublico)) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const campanha = await this.campanhaRepository.findByIdPublico(idPublico);

    if (!campanha || !campanha.estaPublicada()) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const empresa = await this.empresaRepository.findById(
      campanha.empresaId.toString(),
    );

    if (!empresa || !empresa.estaAprovada()) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const compromisso = campanha.compromissoVigente();

    if (!compromisso) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const { beneficiada, regraDoacao, vigencia } = compromisso;
    const hoje = DataCalendario.hojeEm(new Date());

    const campanhaPublica: CampanhaPublica = {
      nome: campanha.nome.valor,
      descricao: campanha.descricao?.valor ?? null,
      temCapa: !!campanha.capaArquivoId,
      empresa: empresa.nomeFantasia,
      beneficiada: {
        tipo: beneficiada.tipo,
        nome: await this.nomeDaBeneficiada(beneficiada),
      },
      regraDoacao: {
        tipo: regraDoacao.tipo,
        valor: regraDoacao.valor
          ? paraDecimal(regraDoacao.valor.centavos)
          : undefined,
        percentual: regraDoacao.percentual
          ? paraDecimal(regraDoacao.percentual.percentual)
          : undefined,
      },
      meta: campanha.meta ? paraDecimal(campanha.meta.centavos) : null,
      vigencia: {
        inicio: vigencia.inicio.toString(),
        fim: vigencia.fim?.toString(),
      },
      situacao: vigencia.naoIniciadaEm(hoje) ? 'NAO_INICIADA' : 'EM_ANDAMENTO',
    };

    return right(campanhaPublica);
  }

  private async nomeDaBeneficiada(beneficiada: Beneficiada): Promise<string> {
    if (beneficiada.tipo === 'INSTITUICAO') {
      const instituicao = await this.instituicaoRepository.findById(
        beneficiada.id,
      );
      return instituicao?.nomeFantasia ?? '';
    }

    const causa = await this.causaRepository.findById(beneficiada.id);
    return causa?.nome ?? '';
  }
}
