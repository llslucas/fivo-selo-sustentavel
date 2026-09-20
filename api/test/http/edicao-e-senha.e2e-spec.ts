import request from 'supertest';
import { PNG } from 'pngjs';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Hasher } from '@domain/fivo/application/ports/cryptography/hasher';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Mailer, TemplateEmail } from '@domain/fivo/application/ports/mailer';
import { Storage } from '@domain/fivo/application/ports/storage';
import { Empresa } from '@domain/fivo/entities/empresa';
import { Senha } from '@domain/fivo/entities/senha';
import { User, UserRole } from '@domain/fivo/entities/user';
import { NOME_COOKIE_SESSAO } from '@infra/auth/auth.constants';
import { SessionService } from '@infra/auth/session.service';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { FakeStorage } from '@test/cryptography/fake-storage';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

const SENHA = 'SenhaAtual12345';

function pngBuffer(largura: number, altura: number): Buffer {
  const png = new PNG({ width: largura, height: altura });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

function tokenDoEmail(mailer: FakeMailer, template: TemplateEmail): string {
  const mensagem = mailer.mensagens.find((item) => item.template === template);

  return (mensagem?.dados as { token: string }).token;
}

describe('Rotas P2 — edição cadastral e recuperação de senha (e2e)', () => {
  let contexto: AppDeTeste;
  const mailer = new FakeMailer();
  const storage = new FakeStorage();

  function api() {
    return request(servidorHttp(contexto));
  }

  async function criarUsuario(role: UserRole, email: string): Promise<User> {
    const senha = Senha.create(SENHA);

    if (senha.isLeft()) {
      throw new Error('senha de teste inválida');
    }

    const user = UserFactory.create({
      role,
      email,
      senha: await senha.value.hash(contexto.app.get(Hasher)),
    });
    await contexto.app.get(UserRepository).create(user);

    return user;
  }

  async function criarEmpresa(
    email: string,
    props: Partial<Parameters<typeof EmpresaFactory.create>[0]> = {},
  ): Promise<{ user: User; empresa: Empresa; token: string }> {
    const user = await criarUsuario(UserRole.EMPRESA, email);
    const empresa = EmpresaFactory.create({ usuarioId: user.id, ...props });
    await contexto.app.get(EmpresaRepository).create(empresa);
    const { token } = await contexto.app
      .get(SessionService)
      .criar(user.id.toString());

    return { user, empresa, token };
  }

  function entrar(email: string, senha: string) {
    return api().post('/sessoes').send({ email, senha });
  }

  function tokenDaResposta(resposta: request.Response): string {
    const cookies = resposta.headers['set-cookie'] as unknown as string[];
    const cookie = cookies.find((item) =>
      item.startsWith(`${NOME_COOKIE_SESSAO}=`),
    ) as string;

    return cookie.split(';')[0].slice(NOME_COOKIE_SESSAO.length + 1);
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor
          .overrideProvider(Mailer)
          .useValue(mailer)
          .overrideProvider(Storage)
          .useValue(storage),
    });
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    mailer.mensagens = [];
    mailer.resetFailure();
    storage.arquivos.clear();
    storage.resetFailure();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('PATCH /empresas/me (EMP-08)', () => {
    it('altera nome fantasia, telefone e endereço e devolve os dados atualizados', async () => {
      const { token, empresa } = await criarEmpresa('dona@empresa.test');

      const resposta = await comCookieDeSessao(
        api().patch('/empresas/me').send({
          nomeFantasia: 'Novo Nome',
          telefone: '11888887777',
          cidade: 'Campinas',
          uf: 'sp',
        }),
        token,
      );

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        nomeFantasia: 'Novo Nome',
        telefone: '11888887777',
        cidade: 'Campinas',
        uf: 'SP',
        razaoSocial: 'Empresa Teste LTDA',
      });
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.nomeFantasia).toBe('Novo Nome');
      expect(linha.telefone).toBe('11888887777');
      expect(linha.cnpj).toBe(empresa.cnpj.valor);
    });

    it('troca o logo por um válido; o arquivo anterior permanece (selos já gerados intactos)', async () => {
      const arquivoAntigo = await contexto.prisma.arquivo.create({
        data: {
          id: 'arquivo-antigo',
          tipo: 'LOGO_EMPRESA',
          nomeOriginal: 'antigo.png',
          mime: 'image/png',
          bytes: 10,
          largura: 512,
          altura: 512,
          chaveStorage: 'antigo/antigo.png',
        },
      });
      const { token, empresa } = await criarEmpresa('dona@empresa.test', {
        logoArquivoId: new UniqueEntityId(arquivoAntigo.id),
      });

      const resposta = await comCookieDeSessao(
        api().patch('/empresas/me').attach('logo', pngBuffer(512, 512), {
          filename: 'novo.png',
          contentType: 'image/png',
        }),
        token,
      );

      expect(resposta.status).toBe(200);
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.logoArquivoId).not.toBeNull();
      expect(linha.logoArquivoId).not.toBe(arquivoAntigo.id);
      expect(await contexto.prisma.arquivo.count()).toBe(2);
    });

    it('logo inválido na edição → 422 com o limite, sem trocar o logo nem gravar arquivo', async () => {
      const { token, empresa } = await criarEmpresa('dona@empresa.test');

      const resposta = await comCookieDeSessao(
        api().patch('/empresas/me').attach('logo', pngBuffer(100, 100), {
          filename: 'pequeno.png',
          contentType: 'image/png',
        }),
        token,
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: expect.stringContaining('512x512') as string,
      });
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.logoArquivoId).toBeNull();
      expect(await contexto.prisma.arquivo.count()).toBe(0);
    });

    it('tentar alterar o CNPJ → 422 "CNPJ não pode ser alterado; solicite ao suporte" e nada muda', async () => {
      const { token, empresa } = await criarEmpresa('dona@empresa.test');

      const resposta = await comCookieDeSessao(
        api()
          .patch('/empresas/me')
          .send({ cnpj: '11222333000181', nomeFantasia: 'Não deve gravar' }),
        token,
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: 'CNPJ não pode ser alterado; solicite ao suporte',
      });
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.cnpj).toBe(empresa.cnpj.valor);
      expect(linha.nomeFantasia).toBe('Empresa Teste');
    });

    it('falha do caso de uso depois do upload (CNPJ divergente + logo válido) → 422 e o logo enviado é descartado', async () => {
      const { token } = await criarEmpresa('dona@empresa.test');

      const resposta = await comCookieDeSessao(
        api()
          .patch('/empresas/me')
          .field('cnpj', '11222333000181')
          .attach('logo', pngBuffer(512, 512), {
            filename: 'novo.png',
            contentType: 'image/png',
          }),
        token,
      );

      expect(resposta.status).toBe(422);
      expect(await contexto.prisma.arquivo.count()).toBe(0);
      expect(storage.arquivos.size).toBe(0);
    });

    it('logo de 11 MB na edição → 422 informando o limite', async () => {
      const { token } = await criarEmpresa('dona@empresa.test');

      const resposta = await comCookieDeSessao(
        api()
          .patch('/empresas/me')
          .attach(
            'logo',
            Buffer.concat([
              pngBuffer(512, 512),
              Buffer.alloc(11 * 1024 * 1024),
            ]),
            { filename: 'grande.png', contentType: 'image/png' },
          ),
        token,
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: expect.stringContaining('5 MB') as string,
      });
    });

    it('sem sessão → 401; ADMIN → 403', async () => {
      const semSessao = await api().patch('/empresas/me').send({});
      const admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
      const { token } = await contexto.app
        .get(SessionService)
        .criar(admin.id.toString());
      const comoAdmin = await comCookieDeSessao(
        api().patch('/empresas/me').send({}),
        token,
      );

      expect(semSessao.status).toBe(401);
      expect(comoAdmin.status).toBe(403);
    });
  });

  describe('troca de e-mail (EMP-08 AC3)', () => {
    it('PATCH /empresas/me/email sem sessão → 401 e para ADMIN/INSTITUICAO → 403', async () => {
      const semSessao = await api()
        .patch('/empresas/me/email')
        .send({ novoEmail: 'novo@empresa.test' });
      const resultados: number[] = [];

      for (const role of [UserRole.ADMIN, UserRole.INSTITUICAO]) {
        const intruso = await criarUsuario(role, `${role}@fivo.test`);
        const { token } = await contexto.app
          .get(SessionService)
          .criar(intruso.id.toString());
        const resposta = await comCookieDeSessao(
          api()
            .patch('/empresas/me/email')
            .send({ novoEmail: 'novo@empresa.test' }),
          token,
        );
        resultados.push(resposta.status);
      }

      expect(semSessao.status).toBe(401);
      expect(resultados).toEqual([403, 403]);
      expect(mailer.mensagens).toEqual([]);
    });

    it('o e-mail antigo segue ativo até a confirmação; o link vai para o novo endereço', async () => {
      const { token } = await criarEmpresa('antigo@empresa.test');

      const troca = await comCookieDeSessao(
        api()
          .patch('/empresas/me/email')
          .send({ novoEmail: 'Novo@Empresa.test' }),
        token,
      );
      const perfil = await comCookieDeSessao(api().get('/empresas/me'), token);
      const loginAntigo = await entrar('antigo@empresa.test', SENHA);
      const loginNovo = await entrar('novo@empresa.test', SENHA);

      expect(troca.status).toBe(202);
      expect(perfil.body).toMatchObject({
        email: 'antigo@empresa.test',
        emailPendente: 'novo@empresa.test',
      });
      expect(loginAntigo.status).toBe(200);
      expect(loginNovo.status).toBe(401);
      expect(mailer.mensagens).toEqual([
        {
          para: 'novo@empresa.test',
          template: TemplateEmail.EMAIL_CONFIRMACAO,
          dados: { token: expect.any(String) as string },
        },
      ]);
    });

    it('confirmar com o token válido troca o e-mail de login; o antigo deixa de valer', async () => {
      const { token } = await criarEmpresa('antigo@empresa.test');
      await comCookieDeSessao(
        api()
          .patch('/empresas/me/email')
          .send({ novoEmail: 'novo@empresa.test' }),
        token,
      ).expect(202);

      const confirmacao = await api()
        .post('/empresas/me/email/confirmacao')
        .send({ token: tokenDoEmail(mailer, TemplateEmail.EMAIL_CONFIRMACAO) });
      const loginNovo = await entrar('novo@empresa.test', SENHA);
      const loginAntigo = await entrar('antigo@empresa.test', SENHA);
      const perfil = await comCookieDeSessao(api().get('/empresas/me'), token);

      expect(confirmacao.status).toBe(204);
      expect(loginNovo.status).toBe(200);
      expect(loginAntigo.status).toBe(401);
      expect(perfil.body).toMatchObject({
        email: 'novo@empresa.test',
        emailPendente: null,
      });
    });

    it('token inexistente ou já usado → 400 "Link de confirmação inválido ou expirado"', async () => {
      const { token } = await criarEmpresa('antigo@empresa.test');
      await comCookieDeSessao(
        api()
          .patch('/empresas/me/email')
          .send({ novoEmail: 'novo@empresa.test' }),
        token,
      ).expect(202);
      const tokenValido = tokenDoEmail(mailer, TemplateEmail.EMAIL_CONFIRMACAO);
      await api()
        .post('/empresas/me/email/confirmacao')
        .send({ token: tokenValido })
        .expect(204);

      const inexistente = await api()
        .post('/empresas/me/email/confirmacao')
        .send({ token: 'token-que-nao-existe' });
      const jaUsado = await api()
        .post('/empresas/me/email/confirmacao')
        .send({ token: tokenValido });

      for (const resposta of [inexistente, jaUsado]) {
        expect(resposta.status).toBe(400);
        expect(resposta.body).toMatchObject({
          message: 'Link de confirmação inválido ou expirado',
        });
      }
    });

    it('link com prazo vencido → 400 "Link de confirmação inválido ou expirado", e o login segue com o e-mail antigo', async () => {
      const { token } = await criarEmpresa('antigo@empresa.test');
      await comCookieDeSessao(
        api()
          .patch('/empresas/me/email')
          .send({ novoEmail: 'novo@empresa.test' }),
        token,
      ).expect(202);
      await contexto.prisma.empresa.updateMany({
        where: { emailPendente: 'novo@empresa.test' },
        data: { tokenTrocaEmailExpiraEm: new Date(Date.now() - 60 * 1000) },
      });

      const confirmacao = await api()
        .post('/empresas/me/email/confirmacao')
        .send({ token: tokenDoEmail(mailer, TemplateEmail.EMAIL_CONFIRMACAO) });
      const loginAntigo = await entrar('antigo@empresa.test', SENHA);
      const loginNovo = await entrar('novo@empresa.test', SENHA);

      expect(confirmacao.status).toBe(400);
      expect(confirmacao.body).toMatchObject({
        message: 'Link de confirmação inválido ou expirado',
      });
      expect(loginAntigo.status).toBe(200);
      expect(loginNovo.status).toBe(401);
    });

    it('e-mail novo já cadastrado por outra conta → 409 na confirmação, e o e-mail antigo continua', async () => {
      const { token } = await criarEmpresa('antigo@empresa.test');
      await comCookieDeSessao(
        api()
          .patch('/empresas/me/email')
          .send({ novoEmail: 'ocupado@empresa.test' }),
        token,
      ).expect(202);
      await criarUsuario(UserRole.EMPRESA, 'ocupado@empresa.test');

      const confirmacao = await api()
        .post('/empresas/me/email/confirmacao')
        .send({ token: tokenDoEmail(mailer, TemplateEmail.EMAIL_CONFIRMACAO) });

      expect(confirmacao.status).toBe(409);
      expect((await entrar('antigo@empresa.test', SENHA)).status).toBe(200);
    });
  });

  describe('recuperação de senha (EMP-09)', () => {
    it('recuperação responde 202 com a mesma mensagem exista ou não a conta, e só envia e-mail se existir', async () => {
      await criarUsuario(UserRole.EMPRESA, 'dona@empresa.test');

      const existente = await api()
        .post('/senha/recuperacao')
        .send({ email: 'dona@empresa.test' });
      const inexistente = await api()
        .post('/senha/recuperacao')
        .send({ email: 'ninguem@empresa.test' });

      expect(existente.status).toBe(202);
      expect(inexistente.status).toBe(202);
      expect(inexistente.body).toEqual(existente.body);
      expect(mailer.mensagens).toHaveLength(1);
      expect(mailer.mensagens[0]).toMatchObject({
        para: 'dona@empresa.test',
        template: TemplateEmail.SENHA_REDEFINICAO,
      });
    });

    it('token válido → nova senha vale, a antiga não, e as sessões anteriores caem', async () => {
      const { token: sessaoAntiga } = await criarEmpresa('dona@empresa.test');
      await api()
        .post('/senha/recuperacao')
        .send({ email: 'dona@empresa.test' })
        .expect(202);
      const tokenReset = tokenDoEmail(mailer, TemplateEmail.SENHA_REDEFINICAO);

      const redefinicao = await api()
        .post('/senha/redefinicao')
        .send({ token: tokenReset, novaSenha: 'NovaSenhaSegura99' });
      const loginNovo = await entrar('dona@empresa.test', 'NovaSenhaSegura99');
      const loginAntigo = await entrar('dona@empresa.test', SENHA);
      const comSessaoAntiga = await comCookieDeSessao(
        api().get('/empresas/me'),
        sessaoAntiga,
      );
      const comSessaoNova = await comCookieDeSessao(
        api().get('/empresas/me'),
        tokenDaResposta(loginNovo),
      );

      expect(redefinicao.status).toBe(204);
      expect(loginNovo.status).toBe(200);
      expect(loginAntigo.status).toBe(401);
      expect(comSessaoAntiga.status).toBe(401);
      expect(comSessaoNova.status).toBe(200);
    });

    it('token usado, expirado ou inexistente → 400 "Link de redefinição inválido ou expirado"', async () => {
      await criarUsuario(UserRole.EMPRESA, 'dona@empresa.test');
      await api()
        .post('/senha/recuperacao')
        .send({ email: 'dona@empresa.test' })
        .expect(202);
      const tokenReset = tokenDoEmail(mailer, TemplateEmail.SENHA_REDEFINICAO);
      await api()
        .post('/senha/redefinicao')
        .send({ token: tokenReset, novaSenha: 'NovaSenhaSegura99' })
        .expect(204);
      await api()
        .post('/senha/recuperacao')
        .send({ email: 'dona@empresa.test' })
        .expect(202);
      const tokenExpirado = mailer.mensagens
        .filter((item) => item.template === TemplateEmail.SENHA_REDEFINICAO)
        .map((item) => (item.dados as { token: string }).token)[1];
      await contexto.prisma.tokenSenha.updateMany({
        where: { usadoEm: null },
        data: { expiraEm: new Date(Date.now() - 60_000) },
      });

      const usado = await api()
        .post('/senha/redefinicao')
        .send({ token: tokenReset, novaSenha: 'OutraSenhaSegura99' });
      const expirado = await api()
        .post('/senha/redefinicao')
        .send({ token: tokenExpirado, novaSenha: 'OutraSenhaSegura99' });
      const inexistente = await api()
        .post('/senha/redefinicao')
        .send({ token: 'nao-existe', novaSenha: 'OutraSenhaSegura99' });

      for (const resposta of [usado, expirado, inexistente]) {
        expect(resposta.status).toBe(400);
        expect(resposta.body).toMatchObject({
          message: 'Link de redefinição inválido ou expirado',
        });
      }
    });

    it('nova senha curta → 422 e o token continua utilizável', async () => {
      await criarUsuario(UserRole.EMPRESA, 'dona@empresa.test');
      await api()
        .post('/senha/recuperacao')
        .send({ email: 'dona@empresa.test' })
        .expect(202);
      const tokenReset = tokenDoEmail(mailer, TemplateEmail.SENHA_REDEFINICAO);

      const curta = await api()
        .post('/senha/redefinicao')
        .send({ token: tokenReset, novaSenha: 'curta' });
      const valida = await api()
        .post('/senha/redefinicao')
        .send({ token: tokenReset, novaSenha: 'NovaSenhaSegura99' });

      expect(curta.status).toBe(422);
      expect(curta.body).toMatchObject({
        message: 'A senha deve ter no mínimo 10 caracteres',
      });
      expect(valida.status).toBe(204);
    });

    it('corpo sem os campos obrigatórios → 422', async () => {
      const recuperacao = await api().post('/senha/recuperacao').send({});
      const redefinicao = await api()
        .post('/senha/redefinicao')
        .send({ token: 'x' });

      expect(recuperacao.status).toBe(422);
      expect(redefinicao.status).toBe(422);
    });
  });
});
