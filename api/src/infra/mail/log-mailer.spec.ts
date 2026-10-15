import { TemplateEmail } from '@domain/fivo/application/ports/mailer';
import { Logger } from '@nestjs/common';

import { LogMailer } from './log-mailer';

describe('LogMailer', () => {
  it('resolves and logs "para" + "template"', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const sut = new LogMailer();

    await expect(
      sut.enviar({
        para: 'empresa@exemplo.com',
        template: TemplateEmail.CADASTRO_RECEBIDO,
      }),
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('empresa@exemplo.com'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(TemplateEmail.CADASTRO_RECEBIDO),
    );

    logSpy.mockRestore();
  });

  it('resolves for every declared template', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const sut = new LogMailer();

    const templates = Object.values(TemplateEmail);

    for (const template of templates) {
      await expect(
        sut.enviar({ para: 'destinatario@exemplo.com', template }),
      ).resolves.toBeUndefined();
    }

    expect(logSpy).toHaveBeenCalledTimes(templates.length);

    logSpy.mockRestore();
  });

  it('logs the reset link with the token outside production', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const sut = new LogMailer();

    await sut.enviar({
      para: 'empresa@exemplo.com',
      template: TemplateEmail.SENHA_REDEFINICAO,
      dados: { token: 'token-bruto' },
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('/recuperar-senha/redefinir?token=token-bruto'),
    );

    logSpy.mockRestore();
  });

  it('does not log the token in production', async () => {
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const sut = new LogMailer();

    await sut.enviar({
      para: 'empresa@exemplo.com',
      template: TemplateEmail.SENHA_REDEFINICAO,
      dados: { token: 'token-bruto' },
    });

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('token-bruto'),
    );

    logSpy.mockRestore();
    process.env.NODE_ENV = nodeEnv;
  });
});
