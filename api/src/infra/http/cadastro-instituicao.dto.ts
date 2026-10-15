import { z } from 'zod';

const obrigatorio = z
  .string({ error: 'Campo obrigatório' })
  .trim()
  .min(1, 'Campo obrigatório');

const opcional = z
  .string()
  .optional()
  .transform((valor) => valor?.trim() || undefined);

// Mesma estrutura do cadastro de empresa, mais causa, descrição e a descrição
// livre do documento. cnpj, senha e a descrição do documento só checam
// presença: as regras vivem no domínio, com as mensagens da spec.
export const criarInstituicaoSchema = z.object({
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
  site: obrigatorio,
  contato: obrigatorio,
  causaId: obrigatorio,
  descricao: obrigatorio,
  descricaoDocumento: opcional,
});

export type CriarInstituicaoDto = z.infer<typeof criarInstituicaoSchema>;
