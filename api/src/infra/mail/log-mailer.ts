import {
  Mailer,
  MensagemEmail,
  TemplateEmail,
} from '@domain/fivo/shared/ports/mailer';
import { Injectable, Logger } from '@nestjs/common';

const CAMINHO_REDEFINICAO_SENHA = '/recuperar-senha/redefinir?token=';

@Injectable()
export class LogMailer implements Mailer {
  private readonly logger = new Logger(LogMailer.name);

  enviar(mensagem: MensagemEmail): Promise<void> {
    this.logger.log(
      `Email para=${mensagem.para} template=${mensagem.template}`,
    );

    // Só fora de produção: sem envio real, o link de redefinição aparece no
    // console pra dar pra testar o fluxo. O token é segredo e não vai pro log
    // de produção.
    const token = mensagem.dados?.token;
    if (
      process.env.NODE_ENV !== 'production' &&
      mensagem.template === TemplateEmail.SENHA_REDEFINICAO &&
      typeof token === 'string'
    ) {
      const webUrl = process.env.WEB_URL ?? 'http://localhost:3001';
      this.logger.log(
        `Link de redefinição: ${webUrl}${CAMINHO_REDEFINICAO_SENHA}${token}`,
      );
    }

    return Promise.resolve();
  }
}
