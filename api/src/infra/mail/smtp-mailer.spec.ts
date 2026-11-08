import { TemplateEmail } from '@domain/fivo/shared/ports/mailer';
import { Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { SmtpMailer } from './smtp-mailer';

interface EnvioJson {
  envelope: { from: string; to: string[] };
  message: string;
}

describe('SmtpMailer', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('envia do remetente configurado para o destinatário, com assunto e corpo', async () => {
    const transporter = createTransport({ jsonTransport: true });
    const envio = jest.spyOn(transporter, 'sendMail');
    const sut = new SmtpMailer(
      transporter,
      'Fivo <nao-responda@exemplo.com.br>',
      'https://selo.exemplo.com.br',
    );

    await sut.enviar({
      para: 'empresa@exemplo.com',
      template: TemplateEmail.SENHA_REDEFINICAO,
      dados: { token: 'tok-123' },
    });

    expect(envio).toHaveBeenCalledTimes(1);
    const resultado = (await envio.mock.results[0].value) as EnvioJson;
    const mensagem = JSON.parse(resultado.message) as {
      from: { address: string };
      to: { address: string }[];
      subject: string;
      text: string;
      html: string;
    };

    expect(mensagem.from.address).toBe('nao-responda@exemplo.com.br');
    expect(mensagem.to[0].address).toBe('empresa@exemplo.com');
    expect(mensagem.subject).toBe('Redefinição de senha');
    expect(mensagem.text).toContain(
      'https://selo.exemplo.com.br/recuperar-senha/redefinir?token=tok-123',
    );
    expect(mensagem.html).toContain('tok-123');
  });

  it('não escreve o token no log', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const sut = new SmtpMailer(
      createTransport({ jsonTransport: true }),
      'nao-responda@exemplo.com.br',
      'https://selo.exemplo.com.br',
    );

    await sut.enviar({
      para: 'empresa@exemplo.com',
      template: TemplateEmail.SENHA_REDEFINICAO,
      dados: { token: 'tok-secreto' },
    });

    for (const [linha] of log.mock.calls) {
      expect(String(linha)).not.toContain('tok-secreto');
    }
  });

  it('propaga a falha do servidor SMTP para a fila de reenvio decidir', async () => {
    const transporter = createTransport({ jsonTransport: true });
    jest
      .spyOn(transporter, 'sendMail')
      .mockRejectedValue(new Error('ECONNREFUSED'));
    const sut = new SmtpMailer(transporter, 'a@exemplo.com', 'https://x.com');

    await expect(
      sut.enviar({
        para: 'b@exemplo.com',
        template: TemplateEmail.CADASTRO_APROVADO,
      }),
    ).rejects.toThrow('ECONNREFUSED');
  });
});
