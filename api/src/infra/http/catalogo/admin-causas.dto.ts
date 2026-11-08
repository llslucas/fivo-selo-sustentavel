import { z } from 'zod';

// O zod só checa presença: tamanho e nome em branco são regra do domínio
// (`NomeCausaInvalidoError`), com a mensagem definida no design.
export const criarCausaSchema = z.object({
  nome: z.string({ error: 'Campo obrigatório' }),
  descricao: z.string({ error: 'Campo obrigatório' }),
});

export type CriarCausaDto = z.infer<typeof criarCausaSchema>;

export const editarCausaSchema = z.object({
  nome: z.string().optional(),
  descricao: z.string().optional(),
});

export type EditarCausaDto = z.infer<typeof editarCausaSchema>;
