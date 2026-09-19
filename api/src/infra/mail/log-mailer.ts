import { Mailer, MensagemEmail } from '@domain/fivo/application/ports/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LogMailer implements Mailer {
  private readonly logger = new Logger(LogMailer.name);

  enviar(mensagem: MensagemEmail): Promise<void> {
    this.logger.log(
      `Email para=${mensagem.para} template=${mensagem.template}`,
    );
    return Promise.resolve();
  }
}
