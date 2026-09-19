import request from 'supertest';

import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { Mailer, TemplateEmail } from '@domain/fivo/application/ports/mailer';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import { User, UserRole } from '@domain/fivo/entities/user';
import { SessionService } from '@infra/auth/session.service';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

const MOTIVO_VALIDO = 'Documentação do CNPJ não confere com a razão social.';

describe('AdminEmpresasController (e2e)', () => {
  let contexto: AppDeTeste;
  const mailer = new FakeMailer();
  let admin: User;
  let tokenAdmin: string;
  let sequenciaCnpj = 1;

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

  async function criarEmpresa(
    email: string,
    props: Partial<Parameters<typeof EmpresaFactory.create>[0]> = {},
  ): Promise<Empresa> {
    const dono = await criarUsuario(UserRole.EMPRESA, email);
    const empresa = EmpresaFactory.create({
      usuarioId: dono.id,
      cnpj: cnpjValido(sequenciaCnpj++),
      ...props,
    });
    await contexto.app.get(EmpresaRepository).create(empresa);
    return empresa;
  }

  function comoAdmin(requisicao: request.Test) {
    return comCookieDeSessao(requisicao, tokenAdmin);
  }

  function api() {
    return request(servidorHttp(contexto));
  }

  async function statusNoBanco(empresa: Empresa) {
    const linha = await contexto.prisma.empresa.findUniqueOrThrow({
      where: { id: empresa.id.toString() },
    });
    return linha.status;
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor.overrideProvider(Mailer).useValue(mailer),
    });
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    mailer.mensagens = [];
    mailer.resetFailure();
    admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
    tokenAdmin = await sessaoDe(admin);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('GET /admin/empresas', () => {
    it('lista só as pendentes, da mais antiga para a mais recente, com nome, CNPJ, e-mail e data', async () => {
      const maisNova = await criarEmpresa('nova@empresa.test', {
        razaoSocial: 'Nova LTDA',
        createdAt: new Date('2026-09-03T10:00:00Z'),
      });
      const maisAntiga = await criarEmpresa('antiga@empresa.test', {
        razaoSocial: 'Antiga LTDA',
        createdAt: new Date('2026-09-01T10:00:00Z'),
      });
      await criarEmpresa('aprovada@empresa.test', {
        status: EmpresaStatus.APROVADA,
        createdAt: new Date('2026-09-02T10:00:00Z'),
      });

      const resposta = await comoAdmin(
        api().get('/admin/empresas?estado=PENDENTE_APROVACAO'),
      );

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([
        {
          id: maisAntiga.id.toString(),
          razaoSocial: 'Antiga LTDA',
          cnpj: maisAntiga.cnpj.valor,
          email: 'antiga@empresa.test',
          criadoEm: '2026-09-01T10:00:00.000Z',
        },
        {
          id: maisNova.id.toString(),
          razaoSocial: 'Nova LTDA',
          cnpj: maisNova.cnpj.valor,
          email: 'nova@empresa.test',
          criadoEm: '2026-09-03T10:00:00.000Z',
        },
      ]);
    });

    it('sem o filtro assume PENDENTE_APROVACAO; estado não suportado → 422', async () => {
      await criarEmpresa('pendente@empresa.test');

      const semFiltro = await comoAdmin(api().get('/admin/empresas'));
      const estadoInvalido = await comoAdmin(
        api().get('/admin/empresas?estado=APROVADA'),
      );

      expect(semFiltro.status).toBe(200);
      expect(semFiltro.body).toHaveLength(1);
      expect(estadoInvalido.status).toBe(422);
    });
  });

  describe('decisões', () => {
    it('aprovacao → 204, APROVADA com admin e data-hora, e e-mail de aprovação à empresa', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');

      const resposta = await comoAdmin(
        api().post(`/admin/empresas/${empresa.id.toString()}/aprovacao`),
      );

      expect(resposta.status).toBe(204);
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.status).toBe(EmpresaStatus.APROVADA);
      expect(linha.decididoPor).toBe(admin.id.toString());
      expect(linha.decididoEm).not.toBeNull();
      expect(mailer.mensagens).toEqual([
        {
          para: 'dona@empresa.test',
          template: TemplateEmail.CADASTRO_APROVADO,
        },
      ]);
    });

    it('rejeicao com motivo menor que 20 caracteres → 422 e a empresa segue pendente', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');

      const resposta = await comoAdmin(
        api()
          .post(`/admin/empresas/${empresa.id.toString()}/rejeicao`)
          .send({ motivo: 'curto demais' }),
      );

      expect(resposta.status).toBe(422);
      expect(await statusNoBanco(empresa)).toBe(
        EmpresaStatus.PENDENTE_APROVACAO,
      );
      expect(mailer.mensagens).toEqual([]);
    });

    it('rejeicao com motivo válido → REJEITADA, motivo persistido e enviado por e-mail', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');

      const resposta = await comoAdmin(
        api()
          .post(`/admin/empresas/${empresa.id.toString()}/rejeicao`)
          .send({ motivo: MOTIVO_VALIDO }),
      );

      expect(resposta.status).toBe(204);
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.status).toBe(EmpresaStatus.REJEITADA);
      expect(linha.motivoDecisao).toBe(MOTIVO_VALIDO);
      expect(mailer.mensagens).toEqual([
        {
          para: 'dona@empresa.test',
          template: TemplateEmail.CADASTRO_REJEITADO,
          dados: { motivo: MOTIVO_VALIDO },
        },
      ]);
    });

    it('rejeicao sem o campo motivo → 422', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');

      const resposta = await comoAdmin(
        api()
          .post(`/admin/empresas/${empresa.id.toString()}/rejeicao`)
          .send({}),
      );

      expect(resposta.status).toBe(422);
    });

    it('suspensao de APROVADA → SUSPENSA; reativacao de SUSPENSA → APROVADA', async () => {
      const empresa = await criarEmpresa('dona@empresa.test', {
        status: EmpresaStatus.APROVADA,
      });
      const id = empresa.id.toString();

      const suspensao = await comoAdmin(
        api().post(`/admin/empresas/${id}/suspensao`),
      );
      expect(suspensao.status).toBe(204);
      expect(await statusNoBanco(empresa)).toBe(EmpresaStatus.SUSPENSA);

      const reativacao = await comoAdmin(
        api().post(`/admin/empresas/${id}/reativacao`),
      );
      expect(reativacao.status).toBe(204);
      expect(await statusNoBanco(empresa)).toBe(EmpresaStatus.APROVADA);
    });

    it.each([
      ['suspensao', EmpresaStatus.PENDENTE_APROVACAO],
      ['reativacao', EmpresaStatus.APROVADA],
      ['aprovacao', EmpresaStatus.REJEITADA],
      ['aprovacao', EmpresaStatus.APROVADA],
    ])(
      '%s a partir de %s está fora do conjunto de transições → 409 sem alterar o estado',
      async (acao, estadoInicial) => {
        const empresa = await criarEmpresa('dona@empresa.test', {
          status: estadoInicial,
        });

        const resposta = await comoAdmin(
          api().post(`/admin/empresas/${empresa.id.toString()}/${acao}`),
        );

        expect(resposta.status).toBe(409);
        expect(await statusNoBanco(empresa)).toBe(estadoInicial);
      },
    );

    it('segunda decisão sobre o mesmo pendente → 409 e vale a primeira', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');
      const id = empresa.id.toString();

      const primeira = await comoAdmin(
        api().post(`/admin/empresas/${id}/aprovacao`),
      );
      const segunda = await comoAdmin(
        api()
          .post(`/admin/empresas/${id}/rejeicao`)
          .send({ motivo: MOTIVO_VALIDO }),
      );

      expect(primeira.status).toBe(204);
      expect(segunda.status).toBe(409);
      expect(await statusNoBanco(empresa)).toBe(EmpresaStatus.APROVADA);
    });

    it('empresa inexistente → 404', async () => {
      const resposta = await comoAdmin(
        api().post('/admin/empresas/id-que-nao-existe/aprovacao'),
      );

      expect(resposta.status).toBe(404);
    });

    it('falha do provedor de e-mail não desfaz a aprovação', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');
      mailer.forceFailure();

      const resposta = await comoAdmin(
        api().post(`/admin/empresas/${empresa.id.toString()}/aprovacao`),
      );

      expect(resposta.status).toBe(204);
      expect(await statusNoBanco(empresa)).toBe(EmpresaStatus.APROVADA);
    });
  });

  describe('controle de acesso', () => {
    const rotas: Array<[string, 'get' | 'post', string, object?]> = [
      ['fila', 'get', '/admin/empresas'],
      ['aprovacao', 'post', 'aprovacao'],
      ['rejeicao', 'post', 'rejeicao', { motivo: MOTIVO_VALIDO }],
      ['suspensao', 'post', 'suspensao'],
      ['reativacao', 'post', 'reativacao'],
    ];

    it.each([UserRole.EMPRESA, UserRole.INSTITUICAO])(
      '%s em qualquer endpoint → 403 e nenhum estado alterado',
      async (role) => {
        const empresa = await criarEmpresa('dona@empresa.test');
        const intruso = await criarUsuario(role, 'intruso@fivo.test');
        const token = await sessaoDe(intruso);

        for (const [, metodo, destino, corpo] of rotas) {
          const caminho = destino.startsWith('/')
            ? destino
            : `/admin/empresas/${empresa.id.toString()}/${destino}`;
          const resposta = await comCookieDeSessao(
            api()[metodo](caminho).send(corpo),
            token,
          );

          expect(resposta.status).toBe(403);
        }

        expect(await statusNoBanco(empresa)).toBe(
          EmpresaStatus.PENDENTE_APROVACAO,
        );
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it('sem sessão → 401', async () => {
      const resposta = await api().get('/admin/empresas');

      expect(resposta.status).toBe(401);
    });
  });

  describe('auditoria', () => {
    it('toda mudança de estado gera uma linha em registro_auditoria com autor, estado anterior e novo', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');
      const id = empresa.id.toString();

      await comoAdmin(api().post(`/admin/empresas/${id}/aprovacao`)).expect(
        204,
      );
      await comoAdmin(api().post(`/admin/empresas/${id}/suspensao`)).expect(
        204,
      );
      await comoAdmin(api().post(`/admin/empresas/${id}/reativacao`)).expect(
        204,
      );

      const registros = await contexto.prisma.registroAuditoria.findMany({
        orderBy: { criadoEm: 'asc' },
      });
      expect(
        registros.map((registro) => ({
          usuarioId: registro.usuarioId,
          entidadeId: registro.entidadeId,
          dados: registro.dados,
        })),
      ).toEqual([
        {
          usuarioId: admin.id.toString(),
          entidadeId: id,
          dados: {
            estadoAnterior: 'PENDENTE_APROVACAO',
            estadoNovo: 'APROVADA',
          },
        },
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

    it('a rejeição também é auditada, com o motivo', async () => {
      const empresa = await criarEmpresa('dona@empresa.test');

      await comoAdmin(
        api()
          .post(`/admin/empresas/${empresa.id.toString()}/rejeicao`)
          .send({ motivo: MOTIVO_VALIDO }),
      ).expect(204);

      const registro =
        await contexto.prisma.registroAuditoria.findFirstOrThrow();
      expect(registro.dados).toEqual({
        estadoAnterior: 'PENDENTE_APROVACAO',
        estadoNovo: 'REJEITADA',
        motivo: MOTIVO_VALIDO,
      });
    });
  });
});
