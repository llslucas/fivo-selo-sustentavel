import { Either, left, right } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import {
  TipoBeneficiada,
  CausaRepository,
  InstituicaoRepository,
} from '@domain/fivo/catalogo';
import { EmpresaRepository } from '@domain/fivo/empresas';
import { Injectable } from '@nestjs/common';
import { CampanhaStatus } from '../entities/campanha';
import { DataCalendario } from '../entities/data-calendario';
import { CampanhaRepository } from '../ports/campanha-repository';
import {
  descreverRegra,
  descreverVigencia,
  RegraDoacaoDetalhe,
  VigenciaDetalhe,
} from './campanha-detalhe';
import {
  calcularSituacao,
  resolverNomeBeneficiada,
  SituacaoCampanha,
} from './campanha-publica';

export interface CampanhaDaEmpresaPublica {
  slug: string;
  nome: string;
  descricao: string | null;
  beneficiada: { tipo: TipoBeneficiada; nome: string };
  regraDoacao: RegraDoacaoDetalhe;
  vigencia: VigenciaDetalhe;
  situacao: SituacaoCampanha;
}

export interface EmpresaPublica {
  slug: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  site: string;
  temLogo: boolean;
  campanhas: CampanhaDaEmpresaPublica[];
}

export interface BuscarEmpresaPublicaUseCaseRequest {
  slug: string;
}

export type BuscarEmpresaPublicaUseCaseResponse = Either<
  ResourceNotFoundError,
  EmpresaPublica
>;

@Injectable()
export class BuscarEmpresaPublicaUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly campanhaRepository: CampanhaRepository,
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly causaRepository: CausaRepository,
  ) {}

  async execute({
    slug,
  }: BuscarEmpresaPublicaUseCaseRequest): Promise<BuscarEmpresaPublicaUseCaseResponse> {
    const empresa = await this.empresaRepository.findBySlug(slug);
    if (!empresa || !empresa.estaAprovada()) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    const todas = await this.campanhaRepository.listarPorEmpresa(
      empresa.id.toString(),
    );

    const publicaveis = todas
      .filter((c) => c.status === CampanhaStatus.APROVADA && !!c.slug)
      .sort(
        (a, b) =>
          (b.decididoEm?.getTime() ?? 0) - (a.decididoEm?.getTime() ?? 0),
      );

    const hoje = DataCalendario.hojeEm(new Date());
    const campanhas: CampanhaDaEmpresaPublica[] = [];

    for (const campanha of publicaveis) {
      const compromisso = campanha.compromissoVigente();
      if (!compromisso) continue;

      const { beneficiada, regraDoacao, vigencia } = compromisso;

      campanhas.push({
        slug: campanha.slug!.valor,
        nome: campanha.nome.valor,
        descricao: campanha.descricao?.valor ?? null,
        beneficiada: {
          tipo: beneficiada.tipo,
          nome: await resolverNomeBeneficiada(
            beneficiada,
            this.instituicaoRepository,
            this.causaRepository,
          ),
        },
        regraDoacao: descreverRegra(regraDoacao),
        vigencia: descreverVigencia(vigencia),
        situacao: calcularSituacao(vigencia, hoje),
      });
    }

    return right({
      slug: empresa.slug!.valor,
      nomeFantasia: empresa.nomeFantasia,
      cidade: empresa.cidade,
      uf: empresa.uf,
      site: empresa.site,
      temLogo: !!empresa.logoArquivoId,
      campanhas,
    });
  }
}
