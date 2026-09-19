import request from 'supertest';

import { Hasher } from '@domain/fivo/application/ports/cryptography/hasher';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Senha } from '@domain/fivo/entities/senha';
import { UserRole } from '@domain/fivo/entities/user';
import { NOME_COOKIE_SESSAO } from '@infra/auth/auth.constants';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

const SENHA = 'SenhaCorreta123';

function extrairToken(resposta: request.Response): string {
  const cookies = resposta.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((item) =>
    item.startsWith(`${NOME_COOKIE_SESSAO}=`),
  );

  if (!cookie) {
    throw new Error('cookie de sessão ausente');
  }

  return cookie.split(';')[0].slice(NOME_COOKIE_SESSAO.length + 1);
}

describe('AutenticacaoController (e2e)', () => {
  let contexto: AppDeTeste;

  async function criarUsuario(role: UserRole, email: string) {
    const hasher = contexto.app.get(Hasher);
    const senha = Senha.create(SENHA);

    if (senha.isLeft()) {
      throw new Error('senha de teste inválida');
    }

    const user = UserFactory.create({
      role,
      email,
      senha: await senha.value.hash(hasher),
    });
    await contexto.app.get(UserRepository).create(user);

    return user;
  }

  function entrar(email: string, senha: string) {
    return request(servidorHttp(contexto))
      .post('/sessoes')
      .send({ email, senha });
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it.each([UserRole.EMPRESA, UserRole.INSTITUICAO, UserRole.ADMIN])(
    'login correto de %s → 200 com o papel e Set-Cookie httpOnly',
    async (role) => {
      await criarUsuario(role, 'pessoa@fivo.test');

      const resposta = await entrar('pessoa@fivo.test', SENHA);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ papel: role });
      const cookie = String(resposta.headers['set-cookie'][0]);
      expect(cookie).toContain(`${NOME_COOKIE_SESSAO}=`);
      expect(cookie).toContain('HttpOnly');
    },
  );

  it('e-mail inexistente e senha errada respondem 401 "Credenciais inválidas" idênticos', async () => {
    await criarUsuario(UserRole.EMPRESA, 'pessoa@fivo.test');

    const emailInexistente = await entrar('naoexiste@fivo.test', SENHA);
    const senhaErrada = await entrar('pessoa@fivo.test', 'SenhaErrada123');

    expect(emailInexistente.status).toBe(401);
    expect(senhaErrada.status).toBe(401);
    expect(emailInexistente.body).toMatchObject({
      message: 'Credenciais inválidas',
    });
    expect(senhaErrada.body).toEqual(emailInexistente.body);
  });

  it('5 falhas seguidas → as tentativas seguintes respondem 429, mesmo com a senha certa', async () => {
    await criarUsuario(UserRole.EMPRESA, 'pessoa@fivo.test');

    for (let tentativa = 1; tentativa <= 5; tentativa++) {
      const falha = await entrar('pessoa@fivo.test', 'SenhaErrada123');
      expect(falha.status).toBe(401);
    }

    const bloqueada = await entrar('pessoa@fivo.test', SENHA);

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers['set-cookie']).toBeUndefined();
  });

  it('o cookie do login autentica a requisição seguinte', async () => {
    const user = await criarUsuario(UserRole.EMPRESA, 'pessoa@fivo.test');
    await contexto.app
      .get(EmpresaRepository)
      .create(EmpresaFactory.create({ usuarioId: user.id }));
    const login = await entrar('pessoa@fivo.test', SENHA);

    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/empresas/me'),
      extrairToken(login),
    );

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ email: 'pessoa@fivo.test' });
  });

  it('logout → 204 e o token antigo passa a responder 401', async () => {
    await criarUsuario(UserRole.EMPRESA, 'pessoa@fivo.test');
    const token = extrairToken(await entrar('pessoa@fivo.test', SENHA));

    const logout = await comCookieDeSessao(
      request(servidorHttp(contexto)).delete('/sessoes/atual'),
      token,
    );
    const depois = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/empresas/me'),
      token,
    );

    expect(logout.status).toBe(204);
    expect(depois.status).toBe(401);
    const sessao = await contexto.prisma.sessao.findFirstOrThrow();
    expect(sessao.revogadaEm).not.toBeNull();
  });

  it('logout sem sessão → 401', async () => {
    const resposta = await request(servidorHttp(contexto)).delete(
      '/sessoes/atual',
    );

    expect(resposta.status).toBe(401);
  });

  it('sessão inativa por mais de 8h → 401 na próxima requisição autenticada', async () => {
    await criarUsuario(UserRole.EMPRESA, 'pessoa@fivo.test');
    const token = extrairToken(await entrar('pessoa@fivo.test', SENHA));
    await contexto.prisma.sessao.updateMany({
      data: { ultimoAcessoEm: new Date(Date.now() - 9 * 60 * 60 * 1000) },
    });

    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/empresas/me'),
      token,
    );

    expect(resposta.status).toBe(401);
  });

  it.each([UserRole.ADMIN, UserRole.INSTITUICAO])(
    'acesso cruzado: %s logado numa rota de empresa → 403',
    async (role) => {
      await criarUsuario(role, 'pessoa@fivo.test');
      const token = extrairToken(await entrar('pessoa@fivo.test', SENHA));

      const resposta = await comCookieDeSessao(
        request(servidorHttp(contexto)).get('/empresas/me'),
        token,
      );

      expect(resposta.status).toBe(403);
    },
  );

  it('corpo sem senha → 422 apontando o campo', async () => {
    const resposta = await request(servidorHttp(contexto))
      .post('/sessoes')
      .send({ email: 'pessoa@fivo.test' });

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      errors: [{ campo: 'senha', mensagem: 'Campo obrigatório' }],
    });
  });

  it('fluxo completo: cadastro pela API e login com o e-mail em outra caixa', async () => {
    const cadastro = await request(servidorHttp(contexto))
      .post('/empresas')
      .field('razaoSocial', 'Empresa Teste LTDA')
      .field('nomeFantasia', 'Empresa Teste')
      .field('cnpj', '12345678000195')
      .field('email', 'Contato@EmpresaTeste.com.br')
      .field('senha', SENHA)
      .field('telefone', '11999999999')
      .field('cep', '12345678')
      .field('logradouro', 'Rua Teste')
      .field('numero', '123')
      .field('bairro', 'Bairro Teste')
      .field('cidade', 'Cidade Teste')
      .field('uf', 'SP')
      .field('contato', 'João da Silva');
    expect(cadastro.status).toBe(201);

    const login = await entrar('CONTATO@empresateste.com.br', SENHA);

    expect(login.status).toBe(200);
    expect(login.body).toEqual({ papel: UserRole.EMPRESA });
  });
});
