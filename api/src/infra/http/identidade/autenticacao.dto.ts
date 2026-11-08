import { z } from 'zod';

// Só checa presença: credencial errada é 401 genérico, decidido pelo caso de uso.
export const loginSchema = z.object({
  email: z.string({ error: 'Campo obrigatório' }).trim(),
  senha: z.string({ error: 'Campo obrigatório' }),
});

export type LoginDto = z.infer<typeof loginSchema>;
