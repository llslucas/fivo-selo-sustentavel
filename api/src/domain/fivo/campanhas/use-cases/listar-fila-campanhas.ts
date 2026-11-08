import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import {
  Beneficiada,
  TipoBeneficiada,
  CausaRepository,
  InstituicaoRepository,
} from '@domain/fivo/catalogo';
import { Campanha } from '../entities/campanha';
import { Compromisso } from '../entities/compromisso';
import { User, UserRole } from '@domain/fivo/identidade';
import { Injectable } from '@nestjs/common';
import { CampanhaRepository } from '../ports/campanha-repository';
import { EmpresaRepository } from '@domain/fivo/empresas';
import {
  descreverRegra,
  descreverVigencia,
  RegraDoacaoDetalhe,
  VigenciaDetalhe,
} from './campanha-detalhe';

export type TipoItemFilaCampanhas = 'NOVA' | 'ALTERACAO';

export interface ItemFilaCampanhas {
  campanhaId: string;
  tipo: TipoItemFilaCampanhas;
  empresa: string;
  nome: string;
  beneficiada: { tipo: TipoBeneficiada; nome: string };
  regraDoacao: RegraDoacaoDetalhe;
  vigencia: VigenciaDetalhe;
  submetidoEm: Date;
}

export type ListarFilaCampanhasUseCaseRequest = { user: User };
export type ListarFilaCampanhasUseCaseResponse = Either<
  NotAllowedError,
  ItemFilaCampanhas[]
>;

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
      regraDoacao: descreverRegra(regraDoacao),
      vigencia: descreverVigencia(vigencia),
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
