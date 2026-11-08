import { TemplateEmail } from '@domain/fivo/shared/ports/mailer';

import { montarEmail } from './templates-email';

const WEB = 'https://selo.exemplo.com.br';

const DADOS_POR_TEMPLATE: Record<TemplateEmail, Record<string, unknown>> = {
  [TemplateEmail.CADASTRO_RECEBIDO]: {},
  [TemplateEmail.CADASTRO_APROVADO]: {},
  [TemplateEmail.CADASTRO_REJEITADO]: {
    motivo: 'Documento ilegível, envie de novo',
  },
  [TemplateEmail.CAMPANHA_REJEITADA]: {
    nomeCampanha: 'Natal Solidário',
    motivo: 'Regra de doação ambígua para o consumidor',
  },
  [TemplateEmail.ALTERACAO_CAMPANHA_REJEITADA]: {
    nomeCampanha: 'Natal Solidário',
    motivo: 'Nova beneficiada fora do escopo da campanha',
  },
  [TemplateEmail.EMAIL_CONFIRMACAO]: { token: 'tok-confirmacao' },
  [TemplateEmail.SENHA_REDEFINICAO]: { token: 'tok-senha' },
};

describe('montarEmail', () => {
  it.each(Object.values(TemplateEmail))(
    'monta assunto, texto e HTML para %s',
    (template) => {
      const email = montarEmail(
        {
          para: 'x@exemplo.com',
          template,
          dados: DADOS_POR_TEMPLATE[template],
        },
        WEB,
      );

      expect(email.assunto.length).toBeGreaterThan(0);
      expect(email.texto).toContain('Fivo · Selo Isso Importa');
      expect(email.html).toMatch(/^<!doctype html>/);
    },
  );

  it('dá assuntos diferentes a cada template', () => {
    const assuntos = Object.values(TemplateEmail).map(
      (template) =>
        montarEmail(
          {
            para: 'x@exemplo.com',
            template,
            dados: DADOS_POR_TEMPLATE[template],
          },
          WEB,
        ).assunto,
    );

    expect(new Set(assuntos).size).toBe(assuntos.length);
  });

  it('leva o motivo da rejeição no texto e no HTML', () => {
    const email = montarEmail(
      {
        para: 'x@exemplo.com',
        template: TemplateEmail.CADASTRO_REJEITADO,
        dados: { motivo: 'Documento ilegível, envie de novo' },
      },
      WEB,
    );

    expect(email.texto).toContain('Documento ilegível, envie de novo');
    expect(email.html).toContain('Documento ilegível, envie de novo');
  });

  it('leva o nome da campanha e o motivo na rejeição de campanha', () => {
    const email = montarEmail(
      {
        para: 'x@exemplo.com',
        template: TemplateEmail.CAMPANHA_REJEITADA,
        dados: {
          nomeCampanha: 'Natal Solidário',
          motivo: 'Regra ambígua demais',
        },
      },
      WEB,
    );

    expect(email.texto).toContain('Natal Solidário');
    expect(email.texto).toContain('Regra ambígua demais');
    expect(email.texto).toContain(`${WEB}/campanhas`);
  });

  it('aponta o link de redefinição para o web com o token', () => {
    const email = montarEmail(
      {
        para: 'x@exemplo.com',
        template: TemplateEmail.SENHA_REDEFINICAO,
        dados: { token: 'abc/+=123' },
      },
      WEB,
    );

    const link = `${WEB}/recuperar-senha/redefinir?token=abc%2F%2B%3D123`;
    expect(email.texto).toContain(link);
    expect(email.html).toContain(`href="${link}"`);
  });

  it('aponta o link de confirmação de e-mail para o web com o token', () => {
    const email = montarEmail(
      {
        para: 'x@exemplo.com',
        template: TemplateEmail.EMAIL_CONFIRMACAO,
        dados: { token: 'tok-1' },
      },
      WEB,
    );

    expect(email.texto).toContain(`${WEB}/confirmar-email?token=tok-1`);
  });

  it('escapa HTML vindo dos dados', () => {
    const email = montarEmail(
      {
        para: 'x@exemplo.com',
        template: TemplateEmail.CAMPANHA_REJEITADA,
        dados: {
          nomeCampanha: '<script>alert(1)</script>',
          motivo: 'Motivo com <b>tag</b> & "aspas"',
        },
      },
      WEB,
    );

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain(
      '&lt;b&gt;tag&lt;/b&gt; &amp; &quot;aspas&quot;',
    );
  });

  it.each([
    [TemplateEmail.CADASTRO_REJEITADO, 'motivo'],
    [TemplateEmail.CAMPANHA_REJEITADA, 'nomeCampanha'],
    [TemplateEmail.SENHA_REDEFINICAO, 'token'],
    [TemplateEmail.EMAIL_CONFIRMACAO, 'token'],
  ])('lança quando %s vem sem "%s"', (template, chave) => {
    const dados = { ...DADOS_POR_TEMPLATE[template] };
    delete dados[chave];

    expect(() =>
      montarEmail({ para: 'x@exemplo.com', template, dados }, WEB),
    ).toThrow(chave);
  });
});
