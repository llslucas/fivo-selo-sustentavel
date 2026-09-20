import { z } from 'zod';

export type EsquemaJson = Record<string, unknown>;

export interface ReferenciaOpenApi {
  $ref: string;
}

const componentes = new Map<string, EsquemaJson>();

/**
 * Converte um esquema Zod (na forma que a rota recebe, antes dos transforms)
 * em componente OpenAPI e devolve a `$ref` para `@ApiBody`/`@ApiResponse`.
 * Registrar o mesmo nome de novo substitui o componente, sem duplicar.
 */
export function esquemaOpenApi(
  nome: string,
  schema: z.ZodType,
  propriedadesExtras: Record<string, EsquemaJson> = {},
): ReferenciaOpenApi {
  const esquema = z.toJSONSchema(schema, {
    io: 'input',
    target: 'openapi-3.0',
    unrepresentable: 'any',
  }) as EsquemaJson;

  delete esquema.$schema;
  esquema.properties = {
    ...(esquema.properties as EsquemaJson | undefined),
    ...propriedadesExtras,
  };

  componentes.set(nome, esquema);

  return { $ref: `#/components/schemas/${nome}` };
}

export function componentesOpenApi(): Record<string, EsquemaJson> {
  return Object.fromEntries(componentes);
}

// Corpo de erro do `DomainExceptionFilter` e do `ZodValidationPipe`.
export const erroRespostaSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  errors: z
    .array(z.object({ campo: z.string(), mensagem: z.string() }))
    .optional(),
});

export const ERRO_RESPOSTA = esquemaOpenApi('ErroResposta', erroRespostaSchema);
