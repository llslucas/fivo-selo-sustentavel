import { z } from 'zod';

import { EmpresaStatus } from '@domain/fivo/entities/empresa';

export const filaQuerySchema = z.object({
  estado: z
    .literal(EmpresaStatus.PENDENTE_APROVACAO, {
      error: 'Apenas PENDENTE_APROVACAO é suportado',
    })
    .default(EmpresaStatus.PENDENTE_APROVACAO),
});

// O tamanho mínimo do motivo é regra do domínio (MotivoInsuficienteError).
export const rejeicaoSchema = z.object({
  motivo: z.string({ error: 'Campo obrigatório' }),
});

export type RejeicaoDto = z.infer<typeof rejeicaoSchema>;
