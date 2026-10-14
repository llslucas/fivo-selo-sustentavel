import { Causa } from '@domain/fivo/entities/causa';

export function causaParaResposta(causa: Causa) {
  return {
    id: causa.id.toString(),
    nome: causa.nome,
    descricao: causa.descricao,
    status: causa.status,
  };
}
