import request from 'supertest';

import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { InstituicaoRepository } from '@domain/fivo/catalogo/ports/instituicao-repository';
import { UserRepository } from '@domain/fivo/identidade/ports/user-repository';
import { Mailer, TemplateEmail } from '@domain/fivo/shared/ports/mailer';
import { Storage } from '@domain/fivo/shared/ports/storage';
import { ListarBeneficiadasUseCase } from '@domain/fivo/catalogo/use-cases/listar-beneficiadas';
import { Causa } from '@domain/fivo/catalogo/entities/causa';
import { DocumentoValidacao } from '@domain/fivo/catalogo/entities/documento-validacao';
import {
  Instituicao,
  InstituicaoProps,
  InstituicaoStatus,
} from '@domain/fivo/catalogo/entities/instituicao';
import { User, UserRole } from '@domain/fivo/identidade/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { SessionService } from '@infra/auth/session.service';
import { FakeMailer } from '@test/doubles/fake-mailer';
import { FakeStorage } from '@test/doubles/fake-storage';
import { CausaFactory } from '@test/factories/causa-factory';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
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
const TRANSICAO_INVALIDA = 'Operação não permitida para o estado atual';
const PDF = Buffer.concat([
  Buffer.from('%PDF-1.7\n', 'ascii'),
  Buffer.alloc(512),
]);

describe('AdminInstituicoesController (e2e)', () => {
  let contexto: AppDeTeste;
  const mailer = new FakeMailer();
  const storage = new FakeStorage();
  let admin: User;
  let tokenAdmin: string;
  let causa: Causa;
  let sequenciaCnpj = 1;

  function api() {
    return request(servidorHttp(contexto));
  }

  function comoAdmin(requisicao: request.Test) {
    return comCookieDeSessao(requisicao, tokenAdmin);
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

  /** Documento gravado de verdade (registro + bytes no storage fake). */
  async function enviarDocumento(): Promise<string> {
    const resultado = await contexto.app
      .get(ArquivoService)
      .uploadDocumento({ nomeOriginal: 'estatuto.pdf', buffer: PDF });

    if (resultado.isLeft()) {
      throw resultado.value;
    }

    return resultado.value.id;
  }

  async function criarInstituicao(
    email: string,
    props: Partial<InstituicaoProps> = {},
  ): Promise<Instituicao> {
    const dona = await criarUsuario(UserRole.INSTITUICAO, email);
    const documento = DocumentoValidacao.criar(await enviarDocumento());
    if (documento.isLeft()) {
      throw documento.value;
    }

    const instituicao = InstituicaoFactory.create({
      usuarioId: dona.id,
      cnpj: cnpjValido(sequenciaCnpj++),
      causaId: causa.id,
      documento: documento.value,
      ...props,
    });
    await contexto.app.get(InstituicaoRepository).create(instituicao);
    return instituicao;
  }

  async function linhaNoBanco(instituicao: Instituicao) {
    return contexto.prisma.instituicao.findUniqueOrThrow({
      where: { id: instituicao.id.toString() },
    });
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
    admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
    tokenAdmin = await sessaoDe(admin);
    causa = CausaFactory.create({ nome: 'Educação' });
    await contexto.app.get(CausaRepository).create(causa);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('GET /admin/instituicoes', () => {
    it('lista só as pendentes, da mais antiga para a mais recente, com CNPJ, causa, cidade, UF, data, documento e coincidência de CNPJ com empresa', async () => {
      const cnpjDeEmpresa = cnpjValido(900);
      const donoEmpresa = await criarUsuario(
        UserRole.EMPRESA,
        'empresa@empresa.test',
      );
      await contexto.app.get(EmpresaRepository).create(
        EmpresaFactory.create({
          usuarioId: donoEmpresa.id,
          cnpj: cnpjDeEmpresa,
        }),
      );

      const maisNova = await criarInstituicao('nova@instituicao.test', {
        razaoSocial: 'Nova Associação',
        cidade: 'Recife',
        uf: 'PE',
        createdAt: new Date('2026-10-03T10:00:00Z'),
      });
      const maisAntiga = await criarInstituicao('antiga@instituicao.test', {
        razaoSocial: 'Antiga Associação',
        cnpj: cnpjDeEmpresa,
        cidade: 'Campinas',
        uf: 'SP',
        createdAt: new Date('2026-10-01T10:00:00Z'),
      });
      await criarInstituicao('aprovada@instituicao.test', {
        status: InstituicaoStatus.APROVADA,
        createdAt: new Date('2026-10-02T10:00:00Z'),
      });

      const resposta = await comoAdmin(api().get('/admin/instituicoes'));

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([
        {
          id: maisAntiga.id.toString(),
          razaoSocial: 'Antiga Associação',
          cnpj: cnpjDeEmpresa.valor,
          causa: 'Educação',
          cidade: 'Campinas',
          uf: 'SP',
          email: 'antiga@instituicao.test',
          documentoArquivoId: maisAntiga.documento.arquivoId.toString(),
          cnpjCoincideComEmpresa: true,
          documentoDisponivel: true,
          criadoEm: '2026-10-01T10:00:00.000Z',
        },
        {
          id: maisNova.id.toString(),
          razaoSocial: 'Nova Associação',
          cnpj: maisNova.cnpj.valor,
          causa: 'Educação',
          cidade: 'Recife',
          uf: 'PE',
          email: 'nova@instituicao.test',
          documentoArquivoId: maisNova.documento.arquivoId.toString(),
          cnpjCoincideComEmpresa: false,
          documentoDisponivel: true,
          criadoEm: '2026-10-03T10:00:00.000Z',
        },
      ]);
    });

    it('documento ilegível no storage → item continua na fila com documentoDisponivel false, e a aprovação dele responde 503', async () => {
      const legivel = await criarInstituicao('legivel@instituicao.test', {
        createdAt: new Date('2026-10-01T10:00:00Z'),
      });
      const ilegivel = await criarInstituicao('ilegivel@instituicao.test', {
        createdAt: new Date('2026-10-02T10:00:00Z'),
      });
      // Só o objeto do documento da segunda some do armazenamento.
      const { chaveStorage } = await contexto.prisma.arquivo.findUniqueOrThrow({
        where: { id: ilegivel.documento.arquivoId.toString() },
      });
      storage.arquivos.delete(chaveStorage);

      const fila = await comoAdmin(api().get('/admin/instituicoes'));

      expect(fila.status).toBe(200);
      expect(fila.body).toEqual([
        expect.objectContaining({
          id: legivel.id.toString(),
          email: 'legivel@instituicao.test',
          documentoArquivoId: legivel.documento.arquivoId.toString(),
          documentoDisponivel: true,
        }),
        expect.objectContaining({
          id: ilegivel.id.toString(),
          email: 'ilegivel@instituicao.test',
          documentoArquivoId: ilegivel.documento.arquivoId.toString(),
          documentoDisponivel: false,
        }),
      ]);

      const aprovacao = await comoAdmin(
        api().post(`/admin/instituicoes/${ilegivel.id.toString()}/aprovacao`),
      );

      expect(aprovacao.status).toBe(503);
      expect(aprovacao.body).toMatchObject({
        message: 'Documento temporariamente indisponível',
      });
      expect((await linhaNoBanco(ilegivel)).status).toBe(
        InstituicaoStatus.PENDENTE_APROVACAO,
      );
    });

    it('a referência do documento abre o arquivo para o admin', async () => {
      await criarInstituicao('dona@instituicao.test');
      const [item] = (await comoAdmin(api().get('/admin/instituicoes')))
        .body as Array<{ documentoArquivoId: string }>;

      const arquivo = await comoAdmin(
        api().get(`/arquivos/${item.documentoArquivoId}`),
      );

      expect(arquivo.status).toBe(200);
      expect(arquivo.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('POST /admin/instituicoes/:id/aprovacao', () => {
    it('→ 204, APROVADA com admin e data-hora, e-mail de aprovação e auditoria', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test');

      const resposta = await comoAdmin(
        api().post(
          `/admin/instituicoes/${instituicao.id.toString()}/aprovacao`,
        ),
      );

      expect(resposta.status).toBe(204);
      const linha = await linhaNoBanco(instituicao);
      expect(linha.status).toBe(InstituicaoStatus.APROVADA);
      expect(linha.decididoPor).toBe(admin.id.toString());
      expect(
        Math.abs(Date.now() - (linha.decididoEm as Date).getTime()),
      ).toBeLessThan(60_000);
      expect(mailer.mensagens).toEqual([
        {
          para: 'dona@instituicao.test',
          template: TemplateEmail.CADASTRO_APROVADO,
        },
      ]);
      const registro =
        await contexto.prisma.registroAuditoria.findFirstOrThrow();
      expect(registro).toMatchObject({
        usuarioId: admin.id.toString(),
        entidadeId: instituicao.id.toString(),
        dados: { estadoAnterior: 'PENDENTE_APROVACAO', estadoNovo: 'APROVADA' },
      });
    });

    it('documento ilegível no storage → 503 "Documento temporariamente indisponível" e estado inalterado', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test');
      storage.arquivos.clear();

      const resposta = await comoAdmin(
        api().post(
          `/admin/instituicoes/${instituicao.id.toString()}/aprovacao`,
        ),
      );

      expect(resposta.status).toBe(503);
      expect(resposta.body).toMatchObject({
        message: 'Documento temporariamente indisponível',
      });
      expect((await linhaNoBanco(instituicao)).status).toBe(
        InstituicaoStatus.PENDENTE_APROVACAO,
      );
      expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      expect(mailer.mensagens).toEqual([]);
    });

    it('instituição inexistente → 404', async () => {
      const resposta = await comoAdmin(
        api().post('/admin/instituicoes/id-que-nao-existe/aprovacao'),
      );

      expect(resposta.status).toBe(404);
    });
  });

  describe('POST /admin/instituicoes/:id/rejeicao', () => {
    it('motivo válido → 204, REJEITADA com o motivo, e-mail com o motivo e auditoria', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test');

      const resposta = await comoAdmin(
        api()
          .post(`/admin/instituicoes/${instituicao.id.toString()}/rejeicao`)
          .send({ motivo: MOTIVO_VALIDO }),
      );

      expect(resposta.status).toBe(204);
      const linha = await linhaNoBanco(instituicao);
      expect(linha.status).toBe(InstituicaoStatus.REJEITADA);
      expect(linha.motivoDecisao).toBe(MOTIVO_VALIDO);
      expect(linha.decididoPor).toBe(admin.id.toString());
      expect(mailer.mensagens).toEqual([
        {
          para: 'dona@instituicao.test',
          template: TemplateEmail.CADASTRO_REJEITADO,
          dados: { motivo: MOTIVO_VALIDO },
        },
      ]);
      const registro =
        await contexto.prisma.registroAuditoria.findFirstOrThrow();
      expect(registro).toMatchObject({
        usuarioId: admin.id.toString(),
        entidadeId: instituicao.id.toString(),
        dados: {
          estadoAnterior: 'PENDENTE_APROVACAO',
          estadoNovo: 'REJEITADA',
          motivo: MOTIVO_VALIDO,
        },
      });
    });

    it('motivo com menos de 20 caracteres → 422 e a instituição segue pendente', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test');

      const resposta = await comoAdmin(
        api()
          .post(`/admin/instituicoes/${instituicao.id.toString()}/rejeicao`)
          .send({ motivo: 'curto demais' }),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: 'O motivo deve ter no mínimo 20 caracteres',
      });
      expect((await linhaNoBanco(instituicao)).status).toBe(
        InstituicaoStatus.PENDENTE_APROVACAO,
      );
      expect(mailer.mensagens).toEqual([]);
    });

    it('sem o campo motivo → 422 e a instituição segue pendente', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test');

      const resposta = await comoAdmin(
        api()
          .post(`/admin/instituicoes/${instituicao.id.toString()}/rejeicao`)
          .send({}),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        errors: [{ campo: 'motivo', mensagem: 'Campo obrigatório' }],
      });
      expect((await linhaNoBanco(instituicao)).status).toBe(
        InstituicaoStatus.PENDENTE_APROVACAO,
      );
    });

    it('instituição inexistente → 404', async () => {
      const resposta = await comoAdmin(
        api()
          .post('/admin/instituicoes/id-que-nao-existe/rejeicao')
          .send({ motivo: MOTIVO_VALIDO }),
      );

      expect(resposta.status).toBe(404);
    });
  });

  describe('decisão repetida', () => {
    it('rejeitar depois de aprovada → 409 e vale a primeira decisão', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test');
      const id = instituicao.id.toString();

      await comoAdmin(api().post(`/admin/instituicoes/${id}/aprovacao`)).expect(
        204,
      );
      const segunda = await comoAdmin(
        api()
          .post(`/admin/instituicoes/${id}/rejeicao`)
          .send({ motivo: MOTIVO_VALIDO }),
      );

      expect(segunda.status).toBe(409);
      expect(segunda.body).toMatchObject({ message: TRANSICAO_INVALIDA });
      expect((await linhaNoBanco(instituicao)).status).toBe(
        InstituicaoStatus.APROVADA,
      );
    });

    it.each([InstituicaoStatus.APROVADA, InstituicaoStatus.REJEITADA])(
      'aprovar a partir de %s → 409 sem alterar o estado',
      async (estado) => {
        const instituicao = await criarInstituicao('dona@instituicao.test', {
          status: estado,
        });

        const resposta = await comoAdmin(
          api().post(
            `/admin/instituicoes/${instituicao.id.toString()}/aprovacao`,
          ),
        );

        expect(resposta.status).toBe(409);
        expect(resposta.body).toMatchObject({ message: TRANSICAO_INVALIDA });
        expect((await linhaNoBanco(instituicao)).status).toBe(estado);
      },
    );
  });

  describe('suspensão, reativação e inativação', () => {
    it('APROVADA → suspensao 204 SUSPENSA → reativacao 204 APROVADA, com auditoria de cada mudança', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test', {
        status: InstituicaoStatus.APROVADA,
      });
      const id = instituicao.id.toString();

      const suspensao = await comoAdmin(
        api().post(`/admin/instituicoes/${id}/suspensao`),
      );
      expect(suspensao.status).toBe(204);
      expect((await linhaNoBanco(instituicao)).status).toBe(
        InstituicaoStatus.SUSPENSA,
      );

      const reativacao = await comoAdmin(
        api().post(`/admin/instituicoes/${id}/reativacao`),
      );
      expect(reativacao.status).toBe(204);
      expect((await linhaNoBanco(instituicao)).status).toBe(
        InstituicaoStatus.APROVADA,
      );

      const registros = await contexto.prisma.registroAuditoria.findMany({
        orderBy: { criadoEm: 'asc' },
      });
      expect(
        registros.map(({ usuarioId, entidadeId, dados }) => ({
          usuarioId,
          entidadeId,
          dados,
        })),
      ).toEqual([
        {
          usuarioId: admin.id.toString(),
          entidadeId: id,
          dados: { estadoAnterior: 'APROVADA', estadoNovo: 'SUSPENSA' },
        },
        {
          usuarioId: admin.id.toString(),
          entidadeId: id,
          dados: { estadoAnterior: 'SUSPENSA', estadoNovo: 'APROVADA' },
        },
      ]);
    });

    it('APROVADA → inativacao 204 INATIVA, sem excluir o registro, com auditoria', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test', {
        status: InstituicaoStatus.APROVADA,
      });

      const resposta = await comoAdmin(
        api().post(
          `/admin/instituicoes/${instituicao.id.toString()}/inativacao`,
        ),
      );

      expect(resposta.status).toBe(204);
      expect((await linhaNoBanco(instituicao)).status).toBe(
        InstituicaoStatus.INATIVA,
      );
      expect(await contexto.prisma.instituicao.count()).toBe(1);
      const registro =
        await contexto.prisma.registroAuditoria.findFirstOrThrow();
      expect(registro).toMatchObject({
        usuarioId: admin.id.toString(),
        dados: { estadoAnterior: 'APROVADA', estadoNovo: 'INATIVA' },
      });
    });

    it.each([
      ['suspensao', InstituicaoStatus.PENDENTE_APROVACAO],
      ['suspensao', InstituicaoStatus.SUSPENSA],
      ['suspensao', InstituicaoStatus.INATIVA],
      ['reativacao', InstituicaoStatus.APROVADA],
      ['reativacao', InstituicaoStatus.INATIVA],
      ['inativacao', InstituicaoStatus.PENDENTE_APROVACAO],
      ['inativacao', InstituicaoStatus.SUSPENSA],
      ['inativacao', InstituicaoStatus.REJEITADA],
    ])(
      '%s a partir de %s está fora do conjunto de transições → 409 sem alterar o estado',
      async (acao, estadoInicial) => {
        const instituicao = await criarInstituicao('dona@instituicao.test', {
          status: estadoInicial,
        });

        const resposta = await comoAdmin(
          api().post(
            `/admin/instituicoes/${instituicao.id.toString()}/${acao}`,
          ),
        );

        expect(resposta.status).toBe(409);
        expect(resposta.body).toMatchObject({ message: TRANSICAO_INVALIDA });
        expect((await linhaNoBanco(instituicao)).status).toBe(estadoInicial);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it.each(['suspensao', 'reativacao', 'inativacao'])(
      '%s de instituição inexistente → 404',
      async (acao) => {
        const resposta = await comoAdmin(
          api().post(`/admin/instituicoes/id-que-nao-existe/${acao}`),
        );

        expect(resposta.status).toBe(404);
      },
    );

    it.each(['suspensao', 'inativacao'])(
      'depois da %s a instituição some do catálogo de beneficiadas',
      async (acao) => {
        const instituicao = await criarInstituicao('dona@instituicao.test', {
          nomeFantasia: 'Amigos do Bairro',
          status: InstituicaoStatus.APROVADA,
        });
        // GET /beneficiadas chega na T32; aqui o catálogo é lido pelo mesmo
        // caso de uso que a rota vai expor, sobre os repositórios reais.
        const catalogo = new ListarBeneficiadasUseCase(
          contexto.app.get(InstituicaoRepository),
          contexto.app.get(CausaRepository),
        );
        const nomesNoCatalogo = async () =>
          (await catalogo.execute()).map((beneficiada) => beneficiada.nome);
        expect(await nomesNoCatalogo()).toContain('Amigos do Bairro');

        await comoAdmin(
          api().post(
            `/admin/instituicoes/${instituicao.id.toString()}/${acao}`,
          ),
        ).expect(204);

        expect(await nomesNoCatalogo()).not.toContain('Amigos do Bairro');
      },
    );
  });

  describe('controle de acesso', () => {
    // Fábricas, não requisições: o supertest abre a conexão ao criar o Test.
    function rotas(id: string): Array<[string, () => request.Test]> {
      return [
        ['fila', () => api().get('/admin/instituicoes')],
        ['aprovacao', () => api().post(`/admin/instituicoes/${id}/aprovacao`)],
        [
          'rejeicao',
          () =>
            api()
              .post(`/admin/instituicoes/${id}/rejeicao`)
              .send({ motivo: MOTIVO_VALIDO }),
        ],
      ];
    }

    it.each([UserRole.EMPRESA, UserRole.INSTITUICAO])(
      '%s em qualquer rota → 403 e nenhum estado alterado',
      async (role) => {
        const instituicao = await criarInstituicao('dona@instituicao.test');
        const token = await sessaoDe(
          await criarUsuario(role, 'intruso@fivo.test'),
        );

        for (const [nome, requisicao] of rotas(instituicao.id.toString())) {
          const resposta = await comCookieDeSessao(requisicao(), token);

          expect([nome, resposta.status]).toEqual([nome, 403]);
        }

        expect((await linhaNoBanco(instituicao)).status).toBe(
          InstituicaoStatus.PENDENTE_APROVACAO,
        );
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it.each([
      [UserRole.EMPRESA, 'suspensao', InstituicaoStatus.APROVADA],
      [UserRole.EMPRESA, 'reativacao', InstituicaoStatus.SUSPENSA],
      [UserRole.EMPRESA, 'inativacao', InstituicaoStatus.APROVADA],
      [UserRole.INSTITUICAO, 'suspensao', InstituicaoStatus.APROVADA],
      [UserRole.INSTITUICAO, 'reativacao', InstituicaoStatus.SUSPENSA],
      [UserRole.INSTITUICAO, 'inativacao', InstituicaoStatus.APROVADA],
    ])(
      '%s em %s de instituição %s (transição válida) → 403 e estado inalterado',
      async (role, acao, estadoInicial) => {
        const instituicao = await criarInstituicao('dona@instituicao.test', {
          status: estadoInicial,
        });
        const token = await sessaoDe(
          await criarUsuario(role, 'intruso@fivo.test'),
        );

        const resposta = await comCookieDeSessao(
          api().post(
            `/admin/instituicoes/${instituicao.id.toString()}/${acao}`,
          ),
          token,
        );

        expect(resposta.status).toBe(403);
        expect((await linhaNoBanco(instituicao)).status).toBe(estadoInicial);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it('sem sessão → 401 em todas as rotas', async () => {
      const instituicao = await criarInstituicao('dona@instituicao.test');
      const id = instituicao.id.toString();
      const posAprovacao: Array<[string, () => request.Test]> = [
        'suspensao',
        'reativacao',
        'inativacao',
      ].map((acao) => [
        acao,
        () => api().post(`/admin/instituicoes/${id}/${acao}`),
      ]);

      for (const [nome, requisicao] of [...rotas(id), ...posAprovacao]) {
        const resposta = await requisicao();

        expect([nome, resposta.status]).toEqual([nome, 401]);
      }
    });
  });
});
