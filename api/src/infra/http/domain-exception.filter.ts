import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

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

    if (exception instanceof HttpException) {
      httpAdapter.reply(
        resposta,
        exception.getResponse(),
        exception.getStatus(),
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
