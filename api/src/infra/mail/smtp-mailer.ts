import { MensagemEmail } from '@domain/fivo/shared/ports/mailer';
import { Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

import { montarEmail } from './templates-email';
import { TransporteEmail } from './transporte-email';

export interface ConfiguracaoSmtp {
  host: string;
  porta: number;
  usuario?: string;
  senha?: string;
  remetente: string;
}

// Alguns envios são aguardados dentro da requisição (cadastro, rejeição):
// um servidor SMTP lento não pode segurar a resposta da API.
const TIMEOUT_CONEXAO_MS = 10_000;
const TIMEOUT_SOCKET_MS = 15_000;

export function criarTransporterSmtp(config: ConfiguracaoSmtp): Transporter {
  return createTransport({
    host: config.host,
    port: config.porta,
    // 465 é TLS direto; nas demais portas (587) o nodemailer negocia STARTTLS.
    secure: config.porta === 465,
    auth:
      config.usuario && config.senha
        ? { user: config.usuario, pass: config.senha }
        : undefined,
    connectionTimeout: TIMEOUT_CONEXAO_MS,
    greetingTimeout: TIMEOUT_CONEXAO_MS,
    socketTimeout: TIMEOUT_SOCKET_MS,
  });
}

/** Envio real por SMTP (Brevo, Resend, Mailgun...). Falhas sobem para a fila de reenvio. */
export class SmtpMailer extends TransporteEmail {
  private readonly logger = new Logger(SmtpMailer.name);

  constructor(
    private readonly transporter: Transporter,
    private readonly remetente: string,
    private readonly webUrl: string,
  ) {
    super();
  }

  async enviar(mensagem: MensagemEmail): Promise<void> {
    const email = montarEmail(mensagem, this.webUrl);

    await this.transporter.sendMail({
      from: this.remetente,
      to: mensagem.para,
      subject: email.assunto,
      text: email.texto,
      html: email.html,
    });

    this.logger.log(`Email enviado template=${mensagem.template}`);
  }
}
