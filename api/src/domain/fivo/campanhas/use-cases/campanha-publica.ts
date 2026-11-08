import {
  Beneficiada,
  CausaRepository,
  InstituicaoRepository,
} from '@domain/fivo/catalogo';
import { DataCalendario } from '../entities/data-calendario';
import { Vigencia } from '../entities/vigencia';

export type SituacaoCampanha = 'NAO_INICIADA' | 'EM_ANDAMENTO';
export async function resolverNomeBeneficiada(
  beneficiada: Beneficiada,
  instituicaoRepository: InstituicaoRepository,
  causaRepository: CausaRepository,
): Promise<string> {
  if (beneficiada.tipo === 'INSTITUICAO') {
    const instituicao = await instituicaoRepository.findById(beneficiada.id);
    return instituicao?.nomeFantasia ?? '';
  }

  const causa = await causaRepository.findById(beneficiada.id);
  return causa?.nome ?? '';
}
export function calcularSituacao(
  vigencia: Vigencia,
  hoje: DataCalendario,
): SituacaoCampanha {
  return vigencia.naoIniciadaEm(hoje) ? 'NAO_INICIADA' : 'EM_ANDAMENTO';
}
