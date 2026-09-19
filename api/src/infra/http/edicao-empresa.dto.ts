import { z } from 'zod';

const textoOpcional = z
  .string()
  .trim()
  .min(1, 'Campo não pode ser vazio')
  .optional();

// cnpj é aceito só para o caso de uso recusá-lo (422, CNPJ imutável).
export const editarEmpresaSchema = z.object({
  cnpj: z.string().optional(),
  nomeFantasia: textoOpcional,
  telefone: textoOpcional,
  cep: textoOpcional,
  logradouro: textoOpcional,
  numero: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  cidade: textoOpcional,
  uf: z
    .string()
    .trim()
    .length(2, 'UF deve ter 2 letras')
    .toUpperCase()
    .optional(),
  site: textoOpcional,
  contato: textoOpcional,
});

export type EditarEmpresaDto = z.infer<typeof editarEmpresaSchema>;

export const trocarEmailSchema = z.object({
  novoEmail: z
    .string({ error: 'Campo obrigatório' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'E-mail inválido' })),
});

export type TrocarEmailDto = z.infer<typeof trocarEmailSchema>;

export const confirmarEmailSchema = z.object({
  token: z.string({ error: 'Campo obrigatório' }).min(1, 'Campo obrigatório'),
});

export type ConfirmarEmailDto = z.infer<typeof confirmarEmailSchema>;
