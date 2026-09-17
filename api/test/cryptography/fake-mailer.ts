import { Mailer, MensagemEmail } from '@domain/fivo/application/ports/mailer';

export class FakeMailer implements Mailer {
  public mensagens: MensagemEmail[] = [];
  public shouldFail = false;
  public failOnEmails: string[] = [];

  forceFailure(): void {
    this.shouldFail = true;
  }

  resetFailure(): void {
    this.shouldFail = false;
    this.failOnEmails = [];
  }

  send(mensagem: MensagemEmail): Promise<void> {
    if (this.shouldFail || this.failOnEmails.includes(mensagem.para)) {
      throw new Error('Mailer indisponível no momento.');
    }

    this.mensagens.push(mensagem);
    return Promise.resolve();
  }
}
