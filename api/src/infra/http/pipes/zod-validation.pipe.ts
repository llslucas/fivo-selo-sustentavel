import { PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { ZodType } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const resultado = this.schema.safeParse(value);

    if (resultado.success) {
      return resultado.data;
    }

    const erros = resultado.error.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensagem: issue.message,
    }));

    throw new UnprocessableEntityException({
      statusCode: 422,
      message: erros[0]?.mensagem ?? 'Dados inválidos',
      errors: erros,
    });
  }
}
