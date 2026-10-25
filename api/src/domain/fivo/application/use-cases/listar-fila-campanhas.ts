import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import {
  Beneficiada,
  TipoBeneficiada,
} from '@domain/fivo/entities/beneficiada';
import { Campanha } from '@domain/fivo/entities/campanha';
import { Compromisso } from '@domain/fivo/entities/compromisso';
import { TipoRegraDoacao } from '@domain/fivo/entities/regra-doacao';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { CausaRepository } from '../ports/database/causa-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';

export type TipoItemFilaCampanhas = 'NOVA' | 'ALTERACAO';

export interface ItemFilaCampanhas {
  campanhaId: string;
  tipo: TipoItemFilaCampanhas;
  empresa: string;
  nome: string;
  beneficiada: { tipo: TipoBeneficiada; nome: string };
  /** Valores em string decimal: `"1.50"` (R$) e `"12.50"` (%). */
  regraDoacao: { tipo: TipoRegraDoacao; valor?: string; percentual?: string };
  /** Datas `AAAA-MM-DD`. */
  vigencia: { inicio: string; fim?: string };
  submetidoEm: Date;
}

export type ListarFilaCampanhasUseCaseRequest = { user: User };
export type ListarFilaCampanhasUseCaseResponse = Either<
  NotAllowedError,
  ItemFilaCampanhas[]
>;

// Centavos e centésimos de ponto viram texto sem passar por número decimal.
function paraDecimal(centesimos: number): string {
  const inteira = Math.floor(centesimos / 100);
  const fracao = String(centesimos % 100).padStart(2, '0');
  return `${inteira}.${fracao}`;
}

@Injectable()
export class ListarFilaCampanhasUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly causaRepository: CausaRepository,
  ) {}

  async execute({
    user,
  }: ListarFilaCampanhasUseCaseRequest): Promise<ListarFilaCampanhasUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const campanhas = await this.campanhaRepository.listarEmAnalise();

    const itens = await Promise.all(
      campanhas.map((campanha) => this.montarItem(campanha)),
    );

    return right(
      itens
        .filter((item): item is ItemFilaCampanhas => item !== null)
        .sort((a, b) => a.submetidoEm.getTime() - b.submetidoEm.getTime()),
    );
  }

  // Na alteração, o admin decide sobre os valores propostos, não sobre os
  // que estão publicados.
  private async montarItem(
    campanha: Campanha,
  ): Promise<ItemFilaCampanhas | null> {
    const alteracao = campanha.alteracaoPendente;
    const compromisso: Compromisso | null = alteracao
      ? alteracao.proposto
      : campanha.compromissoVigente();

    // Campanha em análise sempre passou pela submissão, que exige o
    // compromisso completo; sem ele não há o que analisar.
    if (!compromisso) {
      return null;
    }

    const empresa = await this.empresaRepository.findById(
      campanha.empresaId.toString(),
    );

    const { regraDoacao, vigencia } = compromisso;

    return {
      campanhaId: campanha.id.toString(),
      tipo: alteracao ? 'ALTERACAO' : 'NOVA',
      empresa: empresa?.nomeFantasia ?? '',
      nome: campanha.nome.valor,
      beneficiada: {
        tipo: compromisso.beneficiada.tipo,
        nome: await this.nomeDaBeneficiada(compromisso.beneficiada),
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
      vigencia: {
        inicio: vigencia.inicio.toString(),
        fim: vigencia.fim?.toString(),
      },
      submetidoEm: alteracao
        ? alteracao.createdAt
        : (campanha.submetidaEm ?? campanha.createdAt),
    };
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
