import request from 'supertest';
import { PNG } from 'pngjs';

import { Mailer, TemplateEmail } from '@domain/fivo/application/ports/mailer';
import { Storage } from '@domain/fivo/application/ports/storage';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
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

function pngBuffer(largura: number, altura: number): Buffer {
  const png = new PNG({ width: largura, height: altura });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

function contendo(trecho: string): string {
  return expect.stringContaining(trecho) as string;
}

function idDaResposta(corpo: unknown): string {
  return (corpo as { id: string }).id;
}

function campos(sobrescrever: Record<string, string> = {}) {
  return {
    razaoSocial: 'Empresa Teste LTDA',
    nomeFantasia: 'Empresa Teste',
    cnpj: '12345678000195',
    email: 'contato@empresateste.com.br',
    senha: 'SenhaForte123',
    telefone: '11999999999',
    cep: '12345678',
    logradouro: 'Rua Teste',
    numero: '123',
    complemento: 'Apto 101',
    bairro: 'Bairro Teste',
    cidade: 'Cidade Teste',
    uf: 'SP',
    site: 'https://www.empresateste.com.br',
    contato: 'João da Silva',
    ...sobrescrever,
  };
}

describe('CadastroEmpresaController (e2e)', () => {
  let contexto: AppDeTeste;
  const mailer = new FakeMailer();
  const storage = new FakeStorage();

  function enviarCadastro(
    dados: Record<string, string>,
    logo?: { buffer: Buffer; nome: string; tipo: string },
  ) {
    const requisicao = request(servidorHttp(contexto)).post('/empresas');

    for (const [campo, valor] of Object.entries(dados)) {
      requisicao.field(campo, valor);
    }

    if (logo) {
      requisicao.attach('logo', logo.buffer, {
        filename: logo.nome,
        contentType: logo.tipo,
      });
    }

    return requisicao;
  }

  async function contarLinhas() {
    return {
      usuarios: await contexto.prisma.usuario.count(),
      empresas: await contexto.prisma.empresa.count(),
      arquivos: await contexto.prisma.arquivo.count(),
    };
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

  describe('POST /empresas', () => {
    it('dados válidos → 201 com o id; empresa PENDENTE_APROVACAO e senha só como hash', async () => {
      const resposta = await enviarCadastro(campos());

      expect(resposta.status).toBe(201);
      expect(idDaResposta(resposta.body)).toEqual(expect.any(String));

      const empresa = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: idDaResposta(resposta.body) },
        include: { usuario: true },
      });
      expect(empresa.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
      expect(empresa.cnpj).toBe('12345678000195');
      expect(empresa.usuario?.role).toBe(UserRole.EMPRESA);
      expect(empresa.usuario?.email).toBe('contato@empresateste.com.br');
      expect(empresa.usuario?.senhaHash).toMatch(/^\$argon2id\$/);
      expect(empresa.usuario?.senhaHash).not.toContain('SenhaForte123');
    });

    it('com logo PNG 512x512 válido → 201 e o logo vinculado à empresa', async () => {
      const resposta = await enviarCadastro(campos(), {
        buffer: pngBuffer(512, 512),
        nome: 'logo.png',
        tipo: 'image/png',
      });

      expect(resposta.status).toBe(201);
      const empresa = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: idDaResposta(resposta.body) },
      });
      expect(empresa.logoArquivoId).not.toBeNull();
      const arquivo = await contexto.prisma.arquivo.findUniqueOrThrow({
        where: { id: empresa.logoArquivoId as string },
      });
      expect(arquivo.mime).toBe('image/png');
      expect(storage.arquivos.size).toBe(1);
    });

    it('e-mail de confirmação de recebimento enviado ao cadastrar', async () => {
      await enviarCadastro(campos()).expect(201);

      expect(mailer.mensagens).toEqual([
        {
          para: 'contato@empresateste.com.br',
          template: TemplateEmail.CADASTRO_RECEBIDO,
        },
      ]);
    });

    it('falha no envio do e-mail → 201 mesmo assim e o cadastro permanece', async () => {
      mailer.forceFailure();

      const resposta = await enviarCadastro(campos());

      expect(resposta.status).toBe(201);
      expect((await contarLinhas()).empresas).toBe(1);
    });

    it('CNPJ inválido → 422 "CNPJ inválido" sem persistir nada, nem o logo enviado', async () => {
      const resposta = await enviarCadastro(
        campos({ cnpj: '11111111111111' }),
        {
          buffer: pngBuffer(512, 512),
          nome: 'logo.png',
          tipo: 'image/png',
        },
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({ message: 'CNPJ inválido' });
      expect(await contarLinhas()).toEqual({
        usuarios: 0,
        empresas: 0,
        arquivos: 0,
      });
      expect(storage.arquivos.size).toBe(0);
    });

    it('CNPJ duplicado → 409 "CNPJ ou e-mail já cadastrado"', async () => {
      await enviarCadastro(campos()).expect(201);

      const resposta = await enviarCadastro(
        campos({ email: 'outro@empresateste.com.br' }),
      );

      expect(resposta.status).toBe(409);
      expect(resposta.body).toMatchObject({
        message: 'CNPJ ou e-mail já cadastrado',
      });
      expect((await contarLinhas()).empresas).toBe(1);
    });

    it('e-mail duplicado → 409 "CNPJ ou e-mail já cadastrado"', async () => {
      await enviarCadastro(campos()).expect(201);

      const resposta = await enviarCadastro(campos({ cnpj: '11222333000181' }));

      expect(resposta.status).toBe(409);
      expect(resposta.body).toMatchObject({
        message: 'CNPJ ou e-mail já cadastrado',
      });
      expect((await contarLinhas()).usuarios).toBe(1);
    });

    it('senha com menos de 10 caracteres → 422 com a mensagem da spec', async () => {
      const resposta = await enviarCadastro(campos({ senha: 'curta123' }));

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: 'A senha deve ter no mínimo 10 caracteres',
      });
      expect(await contarLinhas()).toEqual({
        usuarios: 0,
        empresas: 0,
        arquivos: 0,
      });
    });

    it('logo com conteúdo que não é imagem (Content-Type mentindo) → 422 e nada persistido', async () => {
      const resposta = await enviarCadastro(campos(), {
        buffer: Buffer.from('isto não é uma imagem'),
        nome: 'logo.png',
        tipo: 'image/png',
      });

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: contendo('Formatos aceitos'),
      });
      expect(await contarLinhas()).toEqual({
        usuarios: 0,
        empresas: 0,
        arquivos: 0,
      });
    });

    it('logo raster menor que 512x512 → 422 informando a dimensão mínima', async () => {
      const resposta = await enviarCadastro(campos(), {
        buffer: pngBuffer(100, 100),
        nome: 'logo.png',
        tipo: 'image/png',
      });

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: contendo('512x512'),
      });
      expect((await contarLinhas()).empresas).toBe(0);
    });

    it('logo maior que 5 MB → 422 informando o limite de tamanho', async () => {
      const resposta = await enviarCadastro(campos(), {
        buffer: Buffer.concat([
          pngBuffer(512, 512),
          Buffer.alloc(5 * 1024 * 1024),
        ]),
        nome: 'logo.png',
        tipo: 'image/png',
      });

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: contendo('5 MB'),
      });
      expect((await contarLinhas()).empresas).toBe(0);
    });

    it('logo de 11 MB (acima do teto do upload) → 422 informando o limite, e não 413', async () => {
      const resposta = await enviarCadastro(campos(), {
        buffer: Buffer.concat([
          pngBuffer(512, 512),
          Buffer.alloc(11 * 1024 * 1024),
        ]),
        nome: 'logo.png',
        tipo: 'image/png',
      });

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: contendo('5 MB'),
      });
      expect(await contarLinhas()).toEqual({
        usuarios: 0,
        empresas: 0,
        arquivos: 0,
      });
    });

    it('storage indisponível no upload do logo → 503 com a mensagem da spec e nada persistido', async () => {
      storage.forceFailure();

      const resposta = await enviarCadastro(campos(), {
        buffer: pngBuffer(512, 512),
        nome: 'logo.png',
        tipo: 'image/png',
      });

      expect(resposta.status).toBe(503);
      expect(resposta.body).toMatchObject({
        message: 'Não foi possível enviar o logo, tente novamente',
      });
      expect(await contarLinhas()).toEqual({
        usuarios: 0,
        empresas: 0,
        arquivos: 0,
      });
    });

    it('campo obrigatório ausente → 422 apontando o campo', async () => {
      const { razaoSocial, ...semRazaoSocial } = campos();
      void razaoSocial;

      const resposta = await enviarCadastro(semRazaoSocial);

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        errors: [{ campo: 'razaoSocial', mensagem: 'Campo obrigatório' }],
      });
      expect((await contarLinhas()).empresas).toBe(0);
    });

    it('e-mail com maiúsculas é gravado em minúsculas (compatível com o login)', async () => {
      await enviarCadastro(
        campos({ email: 'Contato@EmpresaTeste.com.br' }),
      ).expect(201);

      const usuario = await contexto.prisma.usuario.findFirstOrThrow();
      expect(usuario.email).toBe('contato@empresateste.com.br');
    });
  });

  describe('GET /empresas/me', () => {
    async function criarEmpresaLogada(role: UserRole = UserRole.EMPRESA) {
      const user = UserFactory.create({ role, email: 'dona@empresa.test' });
      await contexto.app.get(UserRepository).create(user);
      const empresa = EmpresaFactory.create({ usuarioId: user.id });
      await contexto.app.get(EmpresaRepository).create(empresa);
      const { token } = await contexto.app
        .get(SessionService)
        .criar(user.id.toString());

      return { user, empresa, token };
    }

    it('empresa autenticada recebe os próprios dados, sem credenciais', async () => {
      const { empresa, token } = await criarEmpresaLogada();

      const resposta = await comCookieDeSessao(
        request(servidorHttp(contexto)).get('/empresas/me'),
        token,
      );

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        id: empresa.id.toString(),
        razaoSocial: 'Empresa Teste LTDA',
        cnpj: '12345678000195',
        email: 'dona@empresa.test',
        status: EmpresaStatus.PENDENTE_APROVACAO,
      });
      expect(JSON.stringify(resposta.body)).not.toMatch(/senha/i);
    });

    it('sem sessão → 401', async () => {
      const resposta = await request(servidorHttp(contexto)).get(
        '/empresas/me',
      );

      expect(resposta.status).toBe(401);
    });

    it.each([UserRole.ADMIN, UserRole.INSTITUICAO])(
      'papel %s → 403',
      async (role) => {
        const { token } = await criarEmpresaLogada(role);

        const resposta = await comCookieDeSessao(
          request(servidorHttp(contexto)).get('/empresas/me'),
          token,
        );

        expect(resposta.status).toBe(403);
      },
    );

    it('cada empresa vê apenas a própria, nunca a de outra conta', async () => {
      const primeira = await criarEmpresaLogada();
      const outroUser = UserFactory.create({
        role: UserRole.EMPRESA,
        email: 'outra@empresa.test',
      });
      await contexto.app.get(UserRepository).create(outroUser);
      const cnpjDaOutra = Cnpj.create('11222333000181');
      if (cnpjDaOutra.isLeft()) {
        throw new Error('CNPJ de teste inválido');
      }
      const outra = EmpresaFactory.create({
        usuarioId: outroUser.id,
        razaoSocial: 'Outra Empresa SA',
        cnpj: cnpjDaOutra.value,
      });
      await contexto.app.get(EmpresaRepository).create(outra);
      const sessaoOutra = await contexto.app
        .get(SessionService)
        .criar(outroUser.id.toString());

      const daPrimeira = await comCookieDeSessao(
        request(servidorHttp(contexto)).get('/empresas/me'),
        primeira.token,
      );
      const daOutra = await comCookieDeSessao(
        request(servidorHttp(contexto)).get('/empresas/me'),
        sessaoOutra.token,
      );

      expect(daPrimeira.body).toMatchObject({
        id: primeira.empresa.id.toString(),
      });
      expect(daOutra.body).toMatchObject({
        id: outra.id.toString(),
        razaoSocial: 'Outra Empresa SA',
      });
    });
  });
});
