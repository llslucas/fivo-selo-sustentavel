export enum TemplateEmail {
  CADASTRO_RECEBIDO = 'CADASTRO_RECEBIDO',
  CADASTRO_APROVADO = 'CADASTRO_APROVADO',
  CADASTRO_REJEITADO = 'CADASTRO_REJEITADO',
  CAMPANHA_REJEITADA = 'CAMPANHA_REJEITADA',
  ALTERACAO_CAMPANHA_REJEITADA = 'ALTERACAO_CAMPANHA_REJEITADA',
  EMAIL_CONFIRMACAO = 'EMAIL_CONFIRMACAO',
  SENHA_REDEFINICAO = 'SENHA_REDEFINICAO',
}

export interface MensagemEmail {
  para: string;
  template: TemplateEmail;
  dados?: Record<string, unknown>;
}

export abstract class Mailer {
  abstract enviar(mensagem: MensagemEmail): Promise<void>;
}
