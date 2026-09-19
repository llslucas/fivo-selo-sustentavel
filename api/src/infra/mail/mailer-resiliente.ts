import {
  Mailer,
  MensagemEmail,
  TemplateEmail,
} from '@domain/fivo/application/ports/mailer';
import { Injectable, Logger } from '@nestjs/common';

import { EmailPendenteService } from './email-pendente.service';
import { TransporteEmail } from './transporte-email';

// Só e-mails sem segredo vão para a fila: token de senha/troca de e-mail não
// pode ficar em claro numa tabela; nesses casos o erro segue para o chamador.
const TEMPLATES_ENFILEIRAVEIS: ReadonlySet<TemplateEmail> = new Set([
  TemplateEmail.CADASTRO_RECEBIDO,
  TemplateEmail.CADASTRO_APROVADO,
  TemplateEmail.CADASTRO_REJEITADO,
]);

@Injectable()
export class MailerResiliente implements Mailer {
  private readonly logger = new Logger(MailerResiliente.name);

  constructor(
    private readonly transporte: TransporteEmail,
    private readonly fila: EmailPendenteService,
  ) {}

  async enviar(mensagem: MensagemEmail): Promise<void> {
    try {
      await this.transporte.enviar(mensagem);
    } catch (erro) {
      if (!TEMPLATES_ENFILEIRAVEIS.has(mensagem.template)) {
        throw erro;
      }

      this.logger.warn(
        `Envio de ${mensagem.template} falhou; enfileirado para reenvio`,
        erro,
      );
      await this.fila.enfileirar(mensagem);
    }
  }
}
