import { Logger } from '@nestjs/common';

import { lerWebUrl } from '@infra/http/campanhas/url-publica-da-campanha';

import { LogMailer } from './log-mailer';
import {
  ConfiguracaoSmtp,
  criarTransporterSmtp,
  SmtpMailer,
} from './smtp-mailer';
import { TransporteEmail } from './transporte-email';

const PORTA_PADRAO = 587;

function lerPorta(valor: string | undefined): number {
  if (!valor?.trim()) {
    return PORTA_PADRAO;
  }

  const porta = Number(valor);

  if (!Number.isInteger(porta) || porta <= 0 || porta > 65535) {
    throw new Error(`SMTP_PORT inválida: "${valor}"`);
  }

  return porta;
}

/** Lê `SMTP_*` e `EMAIL_REMETENTE`; `null` quando `SMTP_HOST` não está definido. */
export function lerConfiguracaoSmtp(
  env: NodeJS.ProcessEnv = process.env,
): ConfiguracaoSmtp | null {
  const host = env.SMTP_HOST?.trim();

  if (!host) {
    return null;
  }

  const remetente = env.EMAIL_REMETENTE?.trim();

  if (!remetente) {
    throw new Error(
      'EMAIL_REMETENTE é obrigatório quando SMTP_HOST está definido',
    );
  }

  return {
    host,
    porta: lerPorta(env.SMTP_PORT),
    usuario: env.SMTP_USER?.trim() || undefined,
    senha: env.SMTP_SENHA || undefined,
    remetente,
  };
}

/**
 * SMTP quando configurado; senão o `LogMailer`. Em produção o SMTP é
 * obrigatório: sem ele, recuperação de senha e troca de e-mail não chegam
 * a ninguém, então a app não sobe. Nos testes é sempre o `LogMailer`, mesmo
 * com `SMTP_*` no `.env`, para nenhuma suíte disparar e-mail de verdade.
 */
export function escolherTransporteEmail(
  env: NodeJS.ProcessEnv = process.env,
): TransporteEmail {
  if (env.NODE_ENV === 'test') {
    return new LogMailer();
  }

  const config = lerConfiguracaoSmtp(env);

  if (config) {
    new Logger('MailModule').log(
      `Transporte de e-mail: SMTP ${config.host}:${config.porta}`,
    );

    return new SmtpMailer(
      criarTransporterSmtp(config),
      config.remetente,
      lerWebUrl(),
    );
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('SMTP_HOST é obrigatório em produção');
  }

  return new LogMailer();
}
