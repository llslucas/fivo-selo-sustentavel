import { z } from 'zod';

const obrigatorio = z
  .string({ error: 'Campo obrigatório' })
  .trim()
  .min(1, 'Campo obrigatório');

const opcional = z
  .string()
  .optional()
  .transform((valor) => valor?.trim() || undefined);

// cnpj e senha só checam presença: as regras (dígitos verificadores, 10
// caracteres) vivem no domínio e devolvem as mensagens definidas na spec.
export const criarEmpresaSchema = z.object({
  razaoSocial: obrigatorio,
  nomeFantasia: obrigatorio,
  cnpj: z.string({ error: 'Campo obrigatório' }),
  email: z
    .string({ error: 'Campo obrigatório' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'E-mail inválido' })),
  senha: z.string({ error: 'Campo obrigatório' }),
  telefone: obrigatorio,
  cep: obrigatorio,
  logradouro: obrigatorio,
  numero: obrigatorio,
  complemento: opcional,
  bairro: obrigatorio,
  cidade: obrigatorio,
  uf: obrigatorio.length(2, 'UF deve ter 2 letras').toUpperCase(),
  site: opcional,
  contato: obrigatorio,
});

export type CriarEmpresaDto = z.infer<typeof criarEmpresaSchema>;
