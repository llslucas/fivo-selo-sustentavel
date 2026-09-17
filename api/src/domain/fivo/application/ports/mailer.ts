export enum TemplateEmail {
  RECUPERACAO_SENHA = 'RECUPERACAO_SENHA',
  BOAS_VINDAS = 'BOAS_VINDAS',
  AVISO_SISTEMA = 'AVISO_SISTEMA',
}

export interface MensagemEmail {
  para: string;
  assunto: string;
  template: TemplateEmail;
  dados?: Record<string, unknown>;
}

export abstract class Mailer {
  abstract send(mensagem: MensagemEmail): Promise<void>;
}
