import { Instituicao } from '@domain/fivo/entities/instituicao';

export abstract class InstituicaoRepository {
  abstract findById(id: string): Promise<Instituicao | null>;
  abstract findByCnpj(cnpj: string): Promise<Instituicao | null>;
  abstract create(instituicao: Instituicao): Promise<void>;
  abstract save(instituicao: Instituicao): Promise<void>;
}
