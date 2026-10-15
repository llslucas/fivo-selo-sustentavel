import { Causa } from '@domain/fivo/entities/causa';

export function causaParaResposta(causa: Causa) {
  return {
    id: causa.id.toString(),
    nome: causa.nome,
    descricao: causa.descricao,
    status: causa.status,
  };
}

// Formato público (autocadastro e seleção de beneficiada): só causas ativas,
// então o estado não vai na resposta.
export function causaAtivaParaResposta(causa: Causa) {
  return {
    id: causa.id.toString(),
    nome: causa.nome,
    descricao: causa.descricao,
  };
}
