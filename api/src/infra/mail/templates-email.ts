import { MensagemEmail, TemplateEmail } from '@domain/fivo/shared/ports/mailer';

export interface EmailMontado {
  assunto: string;
  texto: string;
  html: string;
}

/** Caminhos do `web` que os e-mails apontam. */
export const CAMINHOS_WEB = {
  login: '/login',
  campanhas: '/campanhas',
  redefinicaoSenha: '/recuperar-senha/redefinir?token=',
  confirmacaoEmail: '/confirmar-email?token=',
} as const;

const VERDE = '#1b5e20';

interface Conteudo {
  assunto: string;
  /** Parágrafos em texto puro; o HTML é derivado com escape. */
  paragrafos: string[];
  acao?: { rotulo: string; url: string };
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function texto(dados: MensagemEmail['dados'], chave: string): string {
  const valor = dados?.[chave];

  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new Error(`E-mail sem o dado obrigatório "${chave}"`);
  }

  return valor;
}

function conteudo(mensagem: MensagemEmail, webUrl: string): Conteudo {
  const { dados } = mensagem;

  switch (mensagem.template) {
    case TemplateEmail.CADASTRO_RECEBIDO:
      return {
        assunto: 'Recebemos seu cadastro',
        paragrafos: [
          'Recebemos seu cadastro na Fivo · Selo Isso Importa.',
          'Nossa equipe vai analisar os dados e você recebe um e-mail assim que houver uma decisão.',
        ],
      };

    case TemplateEmail.CADASTRO_APROVADO:
      return {
        assunto: 'Seu cadastro foi aprovado',
        paragrafos: [
          'Seu cadastro na Fivo · Selo Isso Importa foi aprovado.',
          'Você já pode entrar na plataforma com o e-mail e a senha que cadastrou.',
        ],
        acao: {
          rotulo: 'Entrar na plataforma',
          url: webUrl + CAMINHOS_WEB.login,
        },
      };

    case TemplateEmail.CADASTRO_REJEITADO:
      return {
        assunto: 'Seu cadastro não foi aprovado',
        paragrafos: [
          'Seu cadastro na Fivo · Selo Isso Importa não foi aprovado.',
          `Motivo informado pela equipe: ${texto(dados, 'motivo')}`,
        ],
      };

    case TemplateEmail.CAMPANHA_REJEITADA:
      return {
        assunto: 'Sua campanha não foi aprovada',
        paragrafos: [
          `A campanha "${texto(dados, 'nomeCampanha')}" não foi aprovada.`,
          `Motivo informado pela equipe: ${texto(dados, 'motivo')}`,
          'Você pode corrigir a campanha e enviá-la para análise de novo.',
        ],
        acao: {
          rotulo: 'Ver minhas campanhas',
          url: webUrl + CAMINHOS_WEB.campanhas,
        },
      };

    case TemplateEmail.ALTERACAO_CAMPANHA_REJEITADA:
      return {
        assunto: 'A alteração da sua campanha não foi aprovada',
        paragrafos: [
          `A alteração da campanha "${texto(dados, 'nomeCampanha')}" não foi aprovada. A campanha continua publicada com os valores anteriores.`,
          `Motivo informado pela equipe: ${texto(dados, 'motivo')}`,
        ],
        acao: {
          rotulo: 'Ver minhas campanhas',
          url: webUrl + CAMINHOS_WEB.campanhas,
        },
      };

    case TemplateEmail.EMAIL_CONFIRMACAO:
      return {
        assunto: 'Confirme seu novo e-mail',
        paragrafos: [
          'Recebemos um pedido para trocar o e-mail da sua conta na Fivo · Selo Isso Importa para este endereço.',
          'Se não foi você, ignore esta mensagem: o e-mail da conta não muda sem a confirmação.',
        ],
        acao: {
          rotulo: 'Confirmar novo e-mail',
          url:
            webUrl +
            CAMINHOS_WEB.confirmacaoEmail +
            encodeURIComponent(texto(dados, 'token')),
        },
      };

    case TemplateEmail.SENHA_REDEFINICAO:
      return {
        assunto: 'Redefinição de senha',
        paragrafos: [
          'Recebemos um pedido para redefinir a senha da sua conta na Fivo · Selo Isso Importa.',
          'Se não foi você, ignore esta mensagem: sua senha continua a mesma.',
        ],
        acao: {
          rotulo: 'Redefinir senha',
          url:
            webUrl +
            CAMINHOS_WEB.redefinicaoSenha +
            encodeURIComponent(texto(dados, 'token')),
        },
      };
  }
}

function montarHtml({ assunto, paragrafos, acao }: Conteudo): string {
  const corpo = paragrafos
    .map((p) => `<p style="margin:0 0 16px">${escaparHtml(p)}</p>`)
    .join('');

  const botao = acao
    ? `<p style="margin:24px 0"><a href="${escaparHtml(acao.url)}" style="background:${VERDE};color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escaparHtml(acao.rotulo)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#555555">Se o botão não funcionar, copie este endereço no navegador:<br>${escaparHtml(acao.url)}</p>`
    : '';

  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    `<title>${escaparHtml(assunto)}</title></head>` +
    '<body style="margin:0;padding:24px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#222222">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px">' +
    `<p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:${VERDE}">Fivo · Selo Isso Importa</p>` +
    corpo +
    botao +
    '</div></body></html>'
  );
}

function montarTexto({ paragrafos, acao }: Conteudo): string {
  const linhas = [...paragrafos];

  if (acao) {
    linhas.push(`${acao.rotulo}: ${acao.url}`);
  }

  linhas.push('Fivo · Selo Isso Importa');

  return linhas.join('\n\n');
}

/**
 * Assunto, texto e HTML de cada `TemplateEmail`. Lança se faltar um dado que
 * o template exige, para o erro aparecer no envio e não como e-mail vazio.
 */
export function montarEmail(
  mensagem: MensagemEmail,
  webUrl: string,
): EmailMontado {
  const c = conteudo(mensagem, webUrl);

  return { assunto: c.assunto, texto: montarTexto(c), html: montarHtml(c) };
}
