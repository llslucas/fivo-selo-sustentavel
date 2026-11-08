import { z } from 'zod';

export const recuperacaoSchema = z.object({
  email: z
    .string({ error: 'Campo obrigatório' })
    .trim()
    .min(1, 'Campo obrigatório'),
});

export type RecuperacaoDto = z.infer<typeof recuperacaoSchema>;

// O tamanho mínimo da nova senha é regra do domínio (SenhaFracaError).
export const redefinicaoSchema = z.object({
  token: z.string({ error: 'Campo obrigatório' }),
  novaSenha: z.string({ error: 'Campo obrigatório' }),
});

export type RedefinicaoDto = z.infer<typeof redefinicaoSchema>;
