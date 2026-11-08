import { Logger } from '@nestjs/common';

import {
  escolherTransporteEmail,
  lerConfiguracaoSmtp,
} from './escolher-transporte-email';
import { LogMailer } from './log-mailer';
import { SmtpMailer } from './smtp-mailer';

const SMTP = {
  SMTP_HOST: 'smtp-relay.brevo.com',
  SMTP_PORT: '587',
  SMTP_USER: 'usuario',
  SMTP_SENHA: 'chave',
  EMAIL_REMETENTE: 'Fivo <nao-responda@exemplo.com.br>',
  WEB_URL: 'https://selo.exemplo.com.br',
};

describe('lerConfiguracaoSmtp', () => {
  it('devolve null sem SMTP_HOST', () => {
    expect(lerConfiguracaoSmtp({})).toBeNull();
  });

  it('lê host, porta, credenciais e remetente', () => {
    expect(lerConfiguracaoSmtp(SMTP)).toEqual({
      host: 'smtp-relay.brevo.com',
      porta: 587,
      usuario: 'usuario',
      senha: 'chave',
      remetente: 'Fivo <nao-responda@exemplo.com.br>',
    });
  });

  it('usa a porta 587 quando SMTP_PORT não vem', () => {
    expect(lerConfiguracaoSmtp({ ...SMTP, SMTP_PORT: undefined })?.porta).toBe(
      587,
    );
  });

  it('recusa SMTP_PORT que não é número de porta', () => {
    expect(() => lerConfiguracaoSmtp({ ...SMTP, SMTP_PORT: 'abc' })).toThrow(
      'SMTP_PORT',
    );
  });

  it('exige EMAIL_REMETENTE junto com SMTP_HOST', () => {
    expect(() => lerConfiguracaoSmtp({ ...SMTP, EMAIL_REMETENTE: '' })).toThrow(
      'EMAIL_REMETENTE',
    );
  });
});

describe('escolherTransporteEmail', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('usa SMTP quando SMTP_HOST está definido', () => {
    expect(
      escolherTransporteEmail({ ...SMTP, NODE_ENV: 'development' }),
    ).toBeInstanceOf(SmtpMailer);
  });

  it('cai no LogMailer fora de produção sem SMTP', () => {
    expect(escolherTransporteEmail({ NODE_ENV: 'development' })).toBeInstanceOf(
      LogMailer,
    );
  });

  it('não sobe em produção sem SMTP_HOST', () => {
    expect(() =>
      escolherTransporteEmail({
        NODE_ENV: 'production',
        WEB_URL: SMTP.WEB_URL,
      }),
    ).toThrow('SMTP_HOST');
  });

  it('usa o LogMailer nos testes mesmo com SMTP configurado', () => {
    expect(
      escolherTransporteEmail({ ...SMTP, NODE_ENV: 'test' }),
    ).toBeInstanceOf(LogMailer);
  });
});
