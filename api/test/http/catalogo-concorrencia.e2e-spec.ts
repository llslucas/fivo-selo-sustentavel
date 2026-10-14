import request from 'supertest';

import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { InstituicaoRepository } from '@domain/fivo/application/ports/database/instituicao-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Mailer } from '@domain/fivo/application/ports/mailer';
import { Storage } from '@domain/fivo/application/ports/storage';
import { Causa } from '@domain/fivo/entities/causa';
import { DocumentoValidacao } from '@domain/fivo/entities/documento-validacao';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { User, UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { SessionService } from '@infra/auth/session.service';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { FakeStorage } from '@test/cryptography/fake-storage';
import { CausaFactory } from '@test/factories/causa-factory';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

const MOTIVO_VALIDO = 'Estatuto enviado não corresponde à razão social.';
const RODADAS_DE_CORRIDA = 8;
const CNPJ = '12345678000195';
const PDF = Buffer.concat([
  Buffer.from('%PDF-1.7\n', 'ascii'),
  Buffer.alloc(512),
]);

describe('Concorrência e autorização do catálogo de instituições (e2e)', () => {
  let contexto: AppDeTeste;
  const mailer = new FakeMailer();
  const storage = new FakeStorage();
  let tokenAdmin: string;
  let causa: Causa;
  let sequenciaCnpj = 1;

  function api() {
    return request(servidorHttp(contexto));
  }

  async function criarUsuario(role: UserRole, email: string): Promise<User> {
    const user = UserFactory.create({ role, email });
    await contexto.app.get(UserRepository).create(user);
    return user;
  }

  async function sessaoDe(user: User): Promise<string> {
    const { token } = await contexto.app
      .get(SessionService)
      .criar(user.id.toString());
    return token;
  }

  function cadastrarInstituicao(email: string) {
    const campos = {
      razaoSocial: 'Associação Amigos do Bairro',
      nomeFantasia: 'Amigos do Bairro',
      cnpj: CNPJ,
      email,
      senha: 'SenhaForte123',
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua das Flores',
      numero: '45',
      bairro: 'Centro',
      cidade: 'Campinas',
      uf: 'SP',
      site: 'https://amigosdobairro.org',
      contato: 'Maria Souza',
      causaId: causa.id.toString(),
      descricao: 'Reforço escolar',
    };
    const requisicao = api().post('/instituicoes');
    for (const [campo, valor] of Object.entries(campos)) {
      requisicao.field(campo, valor);
    }
    return requisicao.attach('documento', PDF, {
      filename: 'estatuto.pdf',
      contentType: 'application/pdf',
    });
  }

  function cadastrarEmpresa(email: string) {
    const campos = {
      razaoSocial: 'Amigos do Bairro LTDA',
      nomeFantasia: 'Amigos do Bairro',
      cnpj: CNPJ,
      email,
      senha: 'SenhaForte123',
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua das Flores',
      numero: '45',
      bairro: 'Centro',
      cidade: 'Campinas',
      uf: 'SP',
      contato: 'João Souza',
    };
    const requisicao = api().post('/empresas');
    for (const [campo, valor] of Object.entries(campos)) {
      requisicao.field(campo, valor);
    }
    return requisicao;
  }

  async function criarPendente(email: string): Promise<Instituicao> {
    const dona = await criarUsuario(UserRole.INSTITUICAO, email);
    const enviado = await contexto.app
      .get(ArquivoService)
      .uploadDocumento({ nomeOriginal: 'estatuto.pdf', buffer: PDF });
    if (enviado.isLeft()) {
      throw enviado.value;
    }
    const documento = DocumentoValidacao.criar(enviado.value.id);
    if (documento.isLeft()) {
      throw documento.value;
    }

    const instituicao = InstituicaoFactory.create({
      usuarioId: dona.id,
      cnpj: cnpjValido(sequenciaCnpj++),
      causaId: causa.id,
      documento: documento.value,
    });
    await contexto.app.get(InstituicaoRepository).create(instituicao);
    return instituicao;
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
    tokenAdmin = await sessaoDe(
      await criarUsuario(UserRole.ADMIN, 'admin@fivo.test'),
    );
    causa = CausaFactory.create({ nome: 'Educação' });
    await contexto.app.get(CausaRepository).create(causa);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('dois autocadastros simultâneos com o mesmo CNPJ → exatamente um 201 e um 409, um só registro', async () => {
    const [a, b] = await Promise.all([
      cadastrarInstituicao('a@instituicao.test'),
      cadastrarInstituicao('b@instituicao.test'),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const perdedora = a.status === 409 ? a : b;
    expect(perdedora.body).toMatchObject({
      message: 'CNPJ ou e-mail já cadastrado',
    });
    expect(await contexto.prisma.instituicao.count()).toBe(1);
    // admin + o usuário da instituição vencedora; o do 409 foi desfeito.
    expect(await contexto.prisma.usuario.count()).toBe(2);
  });

  it('aprovação e rejeição simultâneas do mesmo cadastro → a primeira vale (204), a segunda recebe 409', async () => {
    for (let rodada = 0; rodada < RODADAS_DE_CORRIDA; rodada++) {
      await contexto.prisma.registroAuditoria.deleteMany();
      mailer.mensagens = [];
      const instituicao = await criarPendente(`dona${rodada}@instituicao.test`);
      const id = instituicao.id.toString();

      const [aprovacao, rejeicao] = await Promise.all([
        comCookieDeSessao(
          api().post(`/admin/instituicoes/${id}/aprovacao`),
          tokenAdmin,
        ),
        comCookieDeSessao(
          api()
            .post(`/admin/instituicoes/${id}/rejeicao`)
            .send({ motivo: MOTIVO_VALIDO }),
          tokenAdmin,
        ),
      ]);

      expect([aprovacao.status, rejeicao.status].sort()).toEqual([204, 409]);
      const linha = await contexto.prisma.instituicao.findUniqueOrThrow({
        where: { id },
      });
      expect(linha.status).toBe(
        aprovacao.status === 204
          ? InstituicaoStatus.APROVADA
          : InstituicaoStatus.REJEITADA,
      );
      expect(await contexto.prisma.registroAuditoria.count()).toBe(1);
      expect(mailer.mensagens).toHaveLength(1);
    }
  });

  it('empresa e instituição com o mesmo CNPJ coexistem, e a fila do admin sinaliza a coincidência', async () => {
    const empresa = await cadastrarEmpresa('empresa@empresa.test');
    const instituicao = await cadastrarInstituicao('contato@instituicao.test');

    expect(empresa.status).toBe(201);
    expect(instituicao.status).toBe(201);
    expect(await contexto.prisma.empresa.count()).toBe(1);
    expect(await contexto.prisma.instituicao.count()).toBe(1);

    const fila = await comCookieDeSessao(
      api().get('/admin/instituicoes'),
      tokenAdmin,
    );

    expect(fila.status).toBe(200);
    expect(fila.body).toMatchObject([
      {
        id: (instituicao.body as { id: string }).id,
        cnpj: CNPJ,
        cnpjCoincideComEmpresa: true,
      },
    ]);
  });

  describe('rotas administrativas do catálogo', () => {
    /** Lidas do documento OpenAPI: uma rota admin nova entra no sweep sozinha. */
    async function rotasAdministrativasDoCatalogo(): Promise<
      Array<{ metodo: 'get' | 'post' | 'patch'; caminho: string }>
    > {
      const documento = await api().get('/docs/openapi.json');
      const paths = (documento.body as { paths: Record<string, object> }).paths;

      return Object.entries(paths)
        .filter(([caminho]) =>
          /^\/admin\/(causas|instituicoes)(\/|$)/.test(caminho),
        )
        .flatMap(([caminho, porMetodo]) =>
          Object.keys(porMetodo).map((metodo) => ({
            metodo: metodo as 'get' | 'post' | 'patch',
            caminho,
          })),
        );
    }

    it.each([UserRole.EMPRESA, UserRole.INSTITUICAO])(
      'toda rota responde 403 para %s autenticada, sem alterar estado',
      async (role) => {
        const instituicao = await criarPendente('dona@instituicao.test');
        const token = await sessaoDe(
          await criarUsuario(role, 'intruso@fivo.test'),
        );
        const rotas = await rotasAdministrativasDoCatalogo();
        expect(rotas).toHaveLength(9);

        for (const { metodo, caminho } of rotas) {
          const id = caminho.startsWith('/admin/causas')
            ? causa.id.toString()
            : instituicao.id.toString();
          const resposta = await comCookieDeSessao(
            api()
              [metodo](caminho.replace('{id}', id))
              .send({ nome: 'Trocada', descricao: 'x', motivo: MOTIVO_VALIDO }),
            token,
          );

          expect([metodo, caminho, resposta.status]).toEqual([
            metodo,
            caminho,
            403,
          ]);
        }

        expect(await contexto.prisma.causa.findMany()).toMatchObject([
          { nome: 'Educação', status: 'ATIVA' },
        ]);
        const linha = await contexto.prisma.instituicao.findUniqueOrThrow({
          where: { id: instituicao.id.toString() },
        });
        expect(linha.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );
  });
});
