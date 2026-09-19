import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { EmailPendenteService } from './email-pendente.service';

const INTERVALO_MS = 30_000;

@Injectable()
export class EmailPendenteWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailPendenteWorker.name);
  private temporizador?: NodeJS.Timeout;
  private emExecucao = false;

  constructor(private readonly fila: EmailPendenteService) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.temporizador = setInterval(() => void this.executar(), INTERVALO_MS);
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.temporizador);
  }

  async executar(): Promise<void> {
    if (this.emExecucao) {
      return;
    }

    this.emExecucao = true;

    try {
      await this.fila.drenar();
    } catch (erro) {
      this.logger.error('Falha ao drenar a fila de e-mail', erro);
    } finally {
      this.emExecucao = false;
    }
  }
}
