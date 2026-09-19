import request from 'supertest';

import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { TemplateEmail } from '@domain/fivo/application/ports/mailer';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { SessionService } from '@infra/auth/session.service';
import {
  EmailPendenteService,
  MAX_TENTATIVAS,
  atrasoDoBackoff,
} from '@infra/mail/email-pendente.service';
import { TransporteEmail } from '@infra/mail/transporte-email';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

const EMAIL_DONA = 'contato@empresateste.com.br';

function campos() {
  return {
    razaoSocial: 'Empresa Teste LTDA',
    nomeFantasia: 'Empresa Teste',
    cnpj: '12345678000195',
    email: EMAIL_DONA,
    senha: 'SenhaForte123',
    telefone: '11999999999',
    cep: '12345678',
    logradouro: 'Rua Teste',
    numero: '123',
    bairro: 'Bairro Teste',
    cidade: 'Cidade Teste',
    uf: 'SP',
    site: 'https://www.empresateste.com.br',
    contato: 'João da Silva',
  };
}

describe('Fila de reenvio de e-mail (e2e)', () => {
  let contexto: AppDeTeste;
  let fila: EmailPendenteService;
  const transporte = new FakeMailer();

  function api() {
    return request(servidorHttp(contexto));
  }

  function cadastrar() {
    const requisicao = api().post('/empresas');
    for (const [campo, valor] of Object.entries(campos())) {
      requisicao.field(campo, valor);
    }
    return requisicao;
  }

  const pendencias = () =>
    contexto.prisma.emailPendente.findMany({ orderBy: { criadoEm: 'asc' } });

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor.overrideProvider(TransporteEmail).useValue(transporte),
    });
    fila = contexto.app.get(EmailPendenteService);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    transporte.mensagens = [];
    transporte.resetFailure();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('e-mail de cadastro falha → 201 e uma linha pendente com destinatário e template', async () => {
    transporte.forceFailure();

    const resposta = await cadastrar();

    expect(resposta.status).toBe(201);
    const linhas = await pendencias();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      para: EMAIL_DONA,
      template: TemplateEmail.CADASTRO_RECEBIDO,
      tentativas: 0,
      enviadoEm: null,
      esgotadoEm: null,
    });
  });

  it('e-mail de decisão falha → 204 e o e-mail da decisão fica pendente', async () => {
    const dono = UserFactory.create({
      role: UserRole.EMPRESA,
      email: EMAIL_DONA,
    });
    await contexto.app.get(UserRepository).create(dono);
    const empresa = EmpresaFactory.create({
      usuarioId: dono.id,
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });
    await contexto.app.get(EmpresaRepository).create(empresa);
    const admin = UserFactory.create({
      role: UserRole.ADMIN,
      email: 'admin@fivo.test',
    });
    await contexto.app.get(UserRepository).create(admin);
    const { token } = await contexto.app
      .get(SessionService)
      .criar(admin.id.toString());
    transporte.forceFailure();

    const resposta = await comCookieDeSessao(
      api().post(`/admin/empresas/${empresa.id.toString()}/aprovacao`),
      token,
    );

    expect(resposta.status).toBe(204);
    const linhas = await pendencias();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      para: EMAIL_DONA,
      template: TemplateEmail.CADASTRO_APROVADO,
    });
  });

  it('worker com o provedor de volta → entrega, marca enviadoEm e não reenvia depois', async () => {
    transporte.forceFailure();
    await cadastrar();
    transporte.resetFailure();
    const [pendente] = await pendencias();
    const depoisDoBackoff = new Date(
      pendente.proximaTentativaEm.getTime() + 1_000,
    );

    const entregues = await fila.drenar(depoisDoBackoff);
    const denovo = await fila.drenar(depoisDoBackoff);

    expect(entregues).toBe(1);
    expect(denovo).toBe(0);
    expect(transporte.mensagens).toEqual([
      { para: EMAIL_DONA, template: TemplateEmail.CADASTRO_RECEBIDO },
    ]);
    const [entregue] = await pendencias();
    expect(entregue.enviadoEm).toEqual(depoisDoBackoff);
    expect(entregue.tentativas).toBe(1);
  });

  it('worker com o provedor ainda fora → incrementa tentativas, adia com backoff e não tenta antes da hora', async () => {
    transporte.forceFailure();
    await cadastrar();
    const [pendente] = await pendencias();
    const agora = new Date(pendente.proximaTentativaEm.getTime() + 1_000);

    await fila.drenar(agora);
    const [apos] = await pendencias();
    expect(apos.tentativas).toBe(1);
    expect(apos.enviadoEm).toBeNull();
    expect(apos.proximaTentativaEm).toEqual(
      new Date(agora.getTime() + atrasoDoBackoff(1)),
    );

    transporte.resetFailure();
    await fila.drenar(agora);

    expect(transporte.mensagens).toHaveLength(0);
    expect((await pendencias())[0].tentativas).toBe(1);
  });

  it('para de tentar depois do teto de tentativas', async () => {
    transporte.forceFailure();
    await cadastrar();
    let agora = new Date();

    for (let i = 0; i < MAX_TENTATIVAS; i++) {
      agora = new Date(agora.getTime() + atrasoDoBackoff(MAX_TENTATIVAS) * 2);
      await fila.drenar(agora);
    }

    const [esgotada] = await pendencias();
    expect(esgotada.tentativas).toBe(MAX_TENTATIVAS);
    expect(esgotada.esgotadoEm).not.toBeNull();

    transporte.resetFailure();
    agora = new Date(agora.getTime() + atrasoDoBackoff(MAX_TENTATIVAS) * 2);
    await fila.drenar(agora);

    expect(transporte.mensagens).toHaveLength(0);
    expect((await pendencias())[0].tentativas).toBe(MAX_TENTATIVAS);
  });
});
