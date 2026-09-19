import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';

interface ErroComStatus extends Error {
  status: number;
}

function ehErroComStatus(exception: unknown): exception is ErroComStatus {
  return (
    exception instanceof Error &&
    typeof (exception as { status?: unknown }).status === 'number'
  );
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const resposta: unknown = host.switchToHttp().getResponse();

    if (exception instanceof PayloadTooLargeException) {
      httpAdapter.reply(
        resposta,
        {
          statusCode: 422,
          message: 'Arquivo inválido: tamanho excede o limite de 5 MB.',
        },
        422,
      );
      return;
    }

    if (exception instanceof HttpException) {
      httpAdapter.reply(
        resposta,
        exception.getResponse(),
        exception.getStatus(),
      );
      return;
    }

    if (exception instanceof NotAllowedError) {
      httpAdapter.reply(
        resposta,
        { statusCode: 403, message: 'Acesso negado' },
        403,
      );
      return;
    }

    if (exception instanceof ResourceNotFoundError) {
      httpAdapter.reply(
        resposta,
        { statusCode: 404, message: 'Recurso não encontrado' },
        404,
      );
      return;
    }

    if (ehErroComStatus(exception)) {
      httpAdapter.reply(
        resposta,
        { statusCode: exception.status, message: exception.message },
        exception.status,
      );
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    httpAdapter.reply(
      resposta,
      { statusCode: 500, message: 'Internal server error' },
      500,
    );
  }
}
