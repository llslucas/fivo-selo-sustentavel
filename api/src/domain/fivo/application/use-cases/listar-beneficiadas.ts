import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { Injectable } from '@nestjs/common';
import { CausaRepository } from '../ports/database/causa-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';

export interface BeneficiadaDisponivel {
  tipo: 'INSTITUICAO' | 'CAUSA';
  id: string;
  nome: string;
  causa: string | null;
  cidade: string | null;
  uf: string | null;
  descricao: string;
  site: string | null;
  logoArquivoId: string | null;
}

const TAMANHO_MINIMO_BUSCA = 2;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Injectable()
export class ListarBeneficiadasUseCase {
  constructor(
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly causaRepository: CausaRepository,
  ) {}

  async execute(busca?: string): Promise<BeneficiadaDisponivel[]> {
    const causas = await this.causaRepository.listarAtivas();
    const instituicoes = await this.instituicaoRepository.listarPorEstado(
      InstituicaoStatus.APROVADA,
      'asc',
    );

    const nomeDaCausa = new Map(
      causas.map((causa) => [causa.id.toString(), causa.nome]),
    );

    const deInstituicoes: BeneficiadaDisponivel[] = instituicoes.map(
      (instituicao) => ({
        tipo: 'INSTITUICAO',
        id: instituicao.id.toString(),
        nome: instituicao.nomeFantasia,
        causa: nomeDaCausa.get(instituicao.causaId.toString()) ?? null,
        cidade: instituicao.cidade,
        uf: instituicao.uf,
        descricao: instituicao.descricao,
        site: instituicao.site,
        logoArquivoId: instituicao.logoArquivoId?.toString() ?? null,
      }),
    );

    const deCausas: BeneficiadaDisponivel[] = causas.map((causa) => ({
      tipo: 'CAUSA',
      id: causa.id.toString(),
      nome: causa.nome,
      causa: null,
      cidade: null,
      uf: null,
      descricao: causa.descricao,
      site: null,
      logoArquivoId: null,
    }));

    const todas = [...deInstituicoes, ...deCausas];

    const termo = busca ? normalizar(busca.trim()) : '';
    const filtradas =
      termo.length >= TAMANHO_MINIMO_BUSCA
        ? todas.filter((beneficiada) =>
            normalizar(beneficiada.nome).includes(termo),
          )
        : todas;

    return filtradas.sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );
  }
}