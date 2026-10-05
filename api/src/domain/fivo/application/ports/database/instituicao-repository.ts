import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';

export type OrdenacaoListaInstituicao = 'asc' | 'desc';

export abstract class InstituicaoRepository {
  abstract findById(id: string): Promise<Instituicao | null>;

  abstract findByCnpj(cnpj: string): Promise<Instituicao | null>;

  abstract findByUsuarioId(usuarioId: string): Promise<Instituicao | null>;

  abstract listarPorEstado(
    estado: InstituicaoStatus,
    ordem: OrdenacaoListaInstituicao,
  ): Promise<Instituicao[]>;

  abstract listarAprovadasPorCausa(
    causaId: string,
    ordem: OrdenacaoListaInstituicao,
  ): Promise<Instituicao[]>;

  abstract buscarDisponiveis(nome: string): Promise<Instituicao[]>;

  abstract create(instituicao: Instituicao): Promise<void>;

  /** Salva apenas dados cadastrais, não afeta o status da institução */
  abstract save(instituicao: Instituicao): Promise<void>;

  /** Responsável por salvar a transição de estados, só funciona se o estado esperado se manter o mesmo */
  abstract salvarTransicao(
    instituicao: Instituicao,
    estadoEsperado: InstituicaoStatus,
  ): Promise<boolean>;
}
