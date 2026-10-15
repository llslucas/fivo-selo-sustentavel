import { z } from 'zod';

// O mínimo de 2 caracteres é regra do caso de uso: abaixo disso a busca não
// filtra (INST-08 AC2).
export const beneficiadasQuerySchema = z.object({
  busca: z.string().optional(),
});

export type BeneficiadasQueryDto = z.infer<typeof beneficiadasQuerySchema>;
