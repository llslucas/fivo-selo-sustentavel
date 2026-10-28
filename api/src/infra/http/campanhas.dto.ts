import { z } from 'zod';

import { TipoRegraDoacao } from '@domain/fivo/entities/regra-doacao';

// O zod só valida a forma. Limites, casas decimais, formato de data e a
// combinação de beneficiada e regra são dos value objects, com as mensagens
// da spec (design §DTOs zod).
const texto = z.string({ error: 'Informe um texto' });

/** Valor monetário ou percentual como string decimal: `"1.50"`, `"12.5"`. */
const decimal = z
  .string({ error: 'Informe o valor como texto decimal' })
  .describe('String decimal com até 2 casas, ex.: "1.50"');

/** Data de calendário `AAAA-MM-DD`; o formato é conferido pelo domínio. */
const data = z
  .string({ error: 'Informe a data como texto AAAA-MM-DD' })
  .describe('Data de calendário AAAA-MM-DD');

const regraDoacaoSchema = z.object({
  tipo: z.enum(TipoRegraDoacao, {
    error: 'Tipo de regra deve ser POR_UNIDADE ou PERCENTUAL',
  }),
  valor: decimal.optional(),
  percentual: decimal.optional(),
});

const vigenciaSchema = z.object({
  inicio: data,
  fim: data.optional(),
});

const camposDaCampanha = {
  descricao: texto.optional(),
  instituicaoId: texto.optional(),
  causaId: texto.optional(),
  regraDoacao: regraDoacaoSchema.optional(),
  meta: decimal.optional(),
  vigencia: vigenciaSchema.optional(),
};

export const criarCampanhaSchema = z.object({
  nome: z.string({ error: 'Campo obrigatório' }),
  ...camposDaCampanha,
});

export type CriarCampanhaDto = z.infer<typeof criarCampanhaSchema>;

// Edição parcial: só o que vier é alterado. A capa tem rota própria.
export const editarCampanhaSchema = z.object({
  nome: texto.optional(),
  ...camposDaCampanha,
});

export type EditarCampanhaDto = z.infer<typeof editarCampanhaSchema>;
