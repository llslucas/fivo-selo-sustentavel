import { MensagemEmail, TemplateEmail } from '@domain/fivo/shared/ports/mailer';
import { Logger } from '@nestjs/common';

import { EmailPendenteService } from './email-pendente.service';
import { MailerResiliente } from './mailer-resiliente';
import { TransporteEmail } from './transporte-email';

class TransporteForaDoAr extends TransporteEmail {
  enviar(): Promise<void> {
    return Promise.reject(new Error('provedor de e-mail indisponível'));
  }
}

class FilaFalsa {
  public enfileiradas: MensagemEmail[] = [];

  enfileirar(mensagem: MensagemEmail): Promise<void> {
    this.enfileiradas.push(mensagem);
    return Promise.resolve();
  }
}

describe('MailerResiliente', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    TemplateEmail.CAMPANHA_REJEITADA,
    TemplateEmail.ALTERACAO_CAMPANHA_REJEITADA,
  ])(
    'transporte falhando com %s enfileira a mensagem para reenvio',
    async (template) => {
      const fila = new FilaFalsa();
      const mailer = new MailerResiliente(
        new TransporteForaDoAr(),
        fila as unknown as EmailPendenteService,
      );
      const mensagem: MensagemEmail = {
        para: 'dona@empresa.com.br',
        template,
        dados: {
          nomeCampanha: 'Doe Sorrisos',
          motivo: 'A regra de doação não condiz com a embalagem.',
        },
      };

      await expect(mailer.enviar(mensagem)).resolves.toBeUndefined();

      expect(fila.enfileiradas).toEqual([mensagem]);
    },
  );
});
