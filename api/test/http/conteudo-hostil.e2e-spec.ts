import request from 'supertest';

import { Mailer } from '@domain/fivo/application/ports/mailer';
import { SessionService } from '@infra/auth/session.service';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

const NOME_HOSTIL =
  '<script>alert("xss")</script> Empresa <img src=x onerror=alert(1)>';
const SVG_COM_SCRIPT =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

function campos(razaoSocial: string) {
  return {
    razaoSocial,
    nomeFantasia: 'Empresa Teste',
    cnpj: '12345678000195',
    email: 'contato@empresateste.com.br',
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

describe('Conteúdo hostil (e2e)', () => {
  let contexto: AppDeTeste;

  function cadastrar(razaoSocial: string) {
    const requisicao = request(servidorHttp(contexto)).post('/empresas');
    for (const [campo, valor] of Object.entries(campos(razaoSocial))) {
      requisicao.field(campo, valor);
    }
    return requisicao;
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor.overrideProvider(Mailer).useValue(new FakeMailer()),
    });
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('nome com <script> → 201; o valor é persistido cru', async () => {
    const resposta = await cadastrar(NOME_HOSTIL);

    expect(resposta.status).toBe(201);
    const empresa = await contexto.prisma.empresa.findUniqueOrThrow({
      where: { id: (resposta.body as { id: string }).id },
    });
    expect(empresa.razaoSocial).toBe(NOME_HOSTIL);
  });

  it('GET /empresas/me devolve o nome como texto de um JSON, sem interpretação', async () => {
    const cadastro = await cadastrar(NOME_HOSTIL);
    expect(cadastro.status).toBe(201);
    const empresa = await contexto.prisma.empresa.findUniqueOrThrow({
      where: { id: (cadastro.body as { id: string }).id },
    });
    const { token } = await contexto.app
      .get(SessionService)
      .criar(empresa.usuarioId as string);

    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/empresas/me'),
      token,
    );

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toMatch(/^application\/json/);
    expect((resposta.body as { razaoSocial: string }).razaoSocial).toBe(
      NOME_HOSTIL,
    );
  });

  it('upload de SVG com <script> no logo → 422 e nenhum arquivo criado', async () => {
    const resposta = await cadastrar('Empresa Teste LTDA').attach(
      'logo',
      Buffer.from(SVG_COM_SCRIPT),
      { filename: 'logo.svg', contentType: 'image/svg+xml' },
    );

    expect(resposta.status).toBe(422);
    expect(await contexto.prisma.arquivo.count()).toBe(0);
    expect(await contexto.prisma.empresa.count()).toBe(0);
  });
});
