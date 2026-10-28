import { TemplateEmail } from '@domain/fivo/application/ports/mailer';
import { Causa } from '@domain/fivo/entities/causa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { User, UserRole } from '@domain/fivo/entities/user';
import { TransporteEmail } from '@infra/mail/transporte-email';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import {
  CenarioCampanhas,
  EmpresaDeTeste,
  corpoCompleto,
} from '@test/helpers/campanhas-e2e';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const MOTIVO = 'A regra de doação não confere com a embalagem.';
const MENSAGEM_TRANSICAO = 'Operação não permitida para o estado atual';
const MENSAGEM_BENEFICIADA_NA_DECISAO =
  'A beneficiada não está mais disponível no catálogo';
const MENSAGEM_MOTIVO = 'O motivo deve ter no mínimo 20 caracteres';
const NAO_ENCONTRADA = { statusCode: 404, message: 'Recurso não encontrado' };
const INEXISTENTE = '00000000-0000-4000-8000-000000000000';

function recente(data: Date): boolean {
  return Math.abs(Date.now() - data.getTime()) < 60_000;
}

describe('Fila e decisões de campanha no painel do admin (e2e)', () => {
  let contexto: AppDeTeste;
  let cenario: CenarioCampanhas;
  const transporte = new FakeMailer();
  let admin: User;
  let tokenAdmin: string;
  let dona: EmpresaDeTeste;
  let instituicao: Instituicao;
  let causa: Causa;

  function comoAdmin<T extends Parameters<typeof comCookieDeSessao>[0]>(
    requisicao: T,
  ) {
    return comCookieDeSessao(requisicao, tokenAdmin);
  }

  async function linha(id: string) {
    return contexto.prisma.campanha.findUniqueOrThrow({ where: { id } });
  }

  async function auditoriasDo(tipo: string) {
    return contexto.prisma.registroAuditoria.findMany({ where: { tipo } });
  }

  /** Campanha completa da dona, já submetida pela rota. */
  async function emAnalise(
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const { id } = await cenario.criarCampanha(
      dona.token,
      corpoCompleto(instituicao, extra),
    );
    await cenario.submeter(dona.token, id);
    return id;
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor.overrideProvider(TransporteEmail).useValue(transporte),
    });
    cenario = new CenarioCampanhas(contexto);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    transporte.mensagens = [];
    transporte.resetFailure();
    admin = await cenario.criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
    tokenAdmin = await cenario.sessaoDe(admin);
    dona = await cenario.criarEmpresa(undefined, 'Café Bom');
    instituicao = await cenario.criarInstituicao(
      InstituicaoStatus.APROVADA,
      'Amigos do Bairro',
    );
    causa = await cenario.criarCausa('Meio ambiente');
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('GET /admin/campanhas/fila', () => {
    it('lista campanhas em análise e alterações pendentes, da submissão mais antiga para a mais recente', async () => {
      const primeira = await emAnalise({ nome: 'Primeira' });
      // Criada antes da alteração, mas submetida depois dela.
      const { id: ultima } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(instituicao, {
          nome: 'Última',
          causaId: causa.id.toString(),
          instituicaoId: undefined,
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '5' },
          vigencia: { inicio: '2026-03-01', fim: '2030-12-31' },
        }),
      );
      const comAlteracao = await cenario.criarAprovada(
        dona.token,
        tokenAdmin,
        corpoCompleto(instituicao, { nome: 'Com alteração' }),
      );
      await comCookieDeSessao(
        cenario
          .api()
          .patch(`/campanhas/${comAlteracao.id}`)
          .send({ regraDoacao: { tipo: 'POR_UNIDADE', valor: '2.05' } }),
        dona.token,
      );
      await cenario.submeter(dona.token, ultima);
      // Fora da fila: rascunho e rejeitada.
      await cenario.criarCampanha(dona.token, corpoCompleto(instituicao));
      const rejeitada = await emAnalise({ nome: 'Rejeitada' });
      await comoAdmin(
        cenario
          .api()
          .post(`/admin/campanhas/${rejeitada}/rejeicao`)
          .send({ motivo: MOTIVO }),
      );
      const alteracao =
        await contexto.prisma.campanhaAlteracao.findFirstOrThrow();

      const resposta = await comoAdmin(
        cenario.api().get('/admin/campanhas/fila'),
      );

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([
        {
          campanhaId: primeira,
          tipo: 'NOVA',
          empresa: 'Café Bom',
          nome: 'Primeira',
          beneficiada: { tipo: 'INSTITUICAO', nome: 'Amigos do Bairro' },
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
          vigencia: { inicio: '2026-01-01' },
          submetidoEm: (
            (await linha(primeira)).submetidaEm as Date
          ).toISOString(),
        },
        {
          campanhaId: comAlteracao.id,
          tipo: 'ALTERACAO',
          empresa: 'Café Bom',
          nome: 'Com alteração',
          beneficiada: { tipo: 'INSTITUICAO', nome: 'Amigos do Bairro' },
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '2.05' },
          vigencia: { inicio: '2026-01-01' },
          submetidoEm: alteracao.criadoEm.toISOString(),
        },
        {
          campanhaId: ultima,
          tipo: 'NOVA',
          empresa: 'Café Bom',
          nome: 'Última',
          beneficiada: { tipo: 'CAUSA', nome: 'Meio ambiente' },
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '5.00' },
          vigencia: { inicio: '2026-03-01', fim: '2030-12-31' },
          submetidoEm: (
            (await linha(ultima)).submetidaEm as Date
          ).toISOString(),
        },
      ]);
    });

    it('fila vazia → 200 com lista vazia', async () => {
      await cenario.criarCampanha(dona.token, corpoCompleto(instituicao));

      const resposta = await comoAdmin(
        cenario.api().get('/admin/campanhas/fila'),
      );

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([]);
    });

    it.each([UserRole.EMPRESA, UserRole.INSTITUICAO])(
      '%s → 403',
      async (role) => {
        await emAnalise();
        const token = await cenario.sessaoComPapel(role);

        const resposta = await comCookieDeSessao(
          cenario.api().get('/admin/campanhas/fila'),
          token,
        );

        expect(resposta.status).toBe(403);
        expect(resposta.body).toMatchObject({ message: 'Acesso negado' });
      },
    );

    it('sem sessão → 401', async () => {
      const resposta = await cenario.api().get('/admin/campanhas/fila');

      expect(resposta.status).toBe(401);
    });
  });

  describe('POST /admin/campanhas/:id/aprovacao', () => {
    function aprovar(id: string) {
      return comoAdmin(cenario.api().post(`/admin/campanhas/${id}/aprovacao`));
    }

    it('campanha em análise → 204, APROVADA com autor e data-hora e transição auditada', async () => {
      const id = await emAnalise();

      const resposta = await aprovar(id);

      expect(resposta.status).toBe(204);
      const gravada = await linha(id);
      expect(gravada.status).toBe('APROVADA');
      expect(gravada.decididoPor).toBe(admin.id.toString());
      expect(recente(gravada.decididoEm as Date)).toBe(true);
      const [registro] = await auditoriasDo('CAMPANHA_APROVADA');
      expect(registro).toMatchObject({
        usuarioId: admin.id.toString(),
        entidadeId: id,
        dados: { estadoAnterior: 'EM_ANALISE', estadoNovo: 'APROVADA' },
      });
      expect(recente(registro.criadoEm)).toBe(true);
      const fila = await comoAdmin(cenario.api().get('/admin/campanhas/fila'));
      expect(fila.body).toEqual([]);
    });

    it.each<[string, () => Promise<void>]>([
      [
        'instituição suspensa',
        () =>
          cenario.alterarStatusDaInstituicao(
            instituicao,
            InstituicaoStatus.SUSPENSA,
          ),
      ],
      [
        'instituição inativada',
        () =>
          cenario.alterarStatusDaInstituicao(
            instituicao,
            InstituicaoStatus.INATIVA,
          ),
      ],
      [
        'instituição devolvida a PENDENTE_APROVACAO',
        () =>
          cenario.alterarStatusDaInstituicao(
            instituicao,
            InstituicaoStatus.PENDENTE_APROVACAO,
          ),
      ],
    ])(
      '%s durante a análise → 409 e estado inalterado',
      async (_rotulo, tirarDoCatalogo) => {
        const id = await emAnalise();
        await tirarDoCatalogo();
        const antes = await linha(id);

        const resposta = await aprovar(id);

        expect(resposta.status).toBe(409);
        expect(resposta.body).toEqual({
          statusCode: 409,
          message: MENSAGEM_BENEFICIADA_NA_DECISAO,
        });
        expect(await linha(id)).toEqual(antes);
        expect(await auditoriasDo('CAMPANHA_APROVADA')).toHaveLength(0);
      },
    );

    it('causa inativada durante a análise → 409 e estado inalterado', async () => {
      const id = await emAnalise({
        instituicaoId: undefined,
        causaId: causa.id.toString(),
      });
      await contexto.prisma.causa.update({
        where: { id: causa.id.toString() },
        data: { status: 'INATIVA' },
      });
      const antes = await linha(id);

      const resposta = await aprovar(id);

      expect(resposta.status).toBe(409);
      expect(resposta.body).toEqual({
        statusCode: 409,
        message: MENSAGEM_BENEFICIADA_NA_DECISAO,
      });
      expect(await linha(id)).toEqual(antes);
    });

    it.each([
      [
        'RASCUNHO',
        async () =>
          (await cenario.criarCampanha(dona.token, corpoCompleto(instituicao)))
            .id,
      ],
      [
        'APROVADA',
        async () =>
          (
            await cenario.criarAprovada(
              dona.token,
              tokenAdmin,
              corpoCompleto(instituicao),
            )
          ).id,
      ],
    ])(
      'campanha %s → 409 "Operação não permitida para o estado atual", nada gravado',
      async (_estado, preparar) => {
        const id = await preparar();
        const antes = await linha(id);
        const auditorias = await contexto.prisma.registroAuditoria.count();

        const resposta = await aprovar(id);

        expect(resposta.status).toBe(409);
        expect(resposta.body).toEqual({
          statusCode: 409,
          message: MENSAGEM_TRANSICAO,
        });
        expect(await linha(id)).toEqual(antes);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(
          auditorias,
        );
      },
    );

    it('campanha inexistente → 404', async () => {
      const resposta = await aprovar(INEXISTENTE);

      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual(NAO_ENCONTRADA);
    });

    it('EMPRESA → 403 sem alterar o estado', async () => {
      const id = await emAnalise();
      const antes = await linha(id);

      const resposta = await comCookieDeSessao(
        cenario.api().post(`/admin/campanhas/${id}/aprovacao`),
        dona.token,
      );

      expect(resposta.status).toBe(403);
      expect(await linha(id)).toEqual(antes);
    });
  });

  describe('POST /admin/campanhas/:id/rejeicao', () => {
    function rejeitar(id: string, corpo: Record<string, unknown>) {
      return comoAdmin(
        cenario.api().post(`/admin/campanhas/${id}/rejeicao`).send(corpo),
      );
    }

    it('motivo válido → 204, REJEITADA com o motivo, e-mail à empresa e transição auditada', async () => {
      const id = await emAnalise();

      const resposta = await rejeitar(id, { motivo: MOTIVO });

      expect(resposta.status).toBe(204);
      const gravada = await linha(id);
      expect(gravada).toMatchObject({
        status: 'REJEITADA',
        motivoUltimaRejeicao: MOTIVO,
        decididoPor: admin.id.toString(),
      });
      expect(recente(gravada.decididoEm as Date)).toBe(true);
      expect(transporte.mensagens).toEqual([
        {
          para: dona.usuario.email,
          template: TemplateEmail.CAMPANHA_REJEITADA,
          dados: { nomeCampanha: 'Café que Educa', motivo: MOTIVO },
        },
      ]);
      const [registro] = await auditoriasDo('CAMPANHA_REJEITADA');
      expect(registro).toMatchObject({
        usuarioId: admin.id.toString(),
        entidadeId: id,
        dados: {
          estadoAnterior: 'EM_ANALISE',
          estadoNovo: 'REJEITADA',
          motivo: MOTIVO,
        },
      });
      expect(recente(registro.criadoEm)).toBe(true);
      const detalhe = await comCookieDeSessao(
        cenario.api().get(`/campanhas/${id}`),
        dona.token,
      );
      expect(detalhe.body).toMatchObject({
        status: 'REJEITADA',
        motivoUltimaRejeicao: MOTIVO,
      });
    });

    it('motivo de exatamente 20 caracteres, sem contar os espaços nas pontas → 204', async () => {
      const id = await emAnalise();

      const resposta = await rejeitar(id, {
        motivo: `   ${'m'.repeat(20)}   `,
      });

      expect(resposta.status).toBe(204);
      expect((await linha(id)).status).toBe('REJEITADA');
    });

    it('motivo de 19 caracteres, mesmo com espaços nas pontas → 422, estado inalterado e nenhum e-mail', async () => {
      const id = await emAnalise();
      const antes = await linha(id);

      const resposta = await rejeitar(id, {
        motivo: `   ${'m'.repeat(19)}   `,
      });

      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual({
        statusCode: 422,
        message: MENSAGEM_MOTIVO,
      });
      expect(await linha(id)).toEqual(antes);
      expect(transporte.mensagens).toEqual([]);
      expect(await auditoriasDo('CAMPANHA_REJEITADA')).toHaveLength(0);
    });

    it('sem motivo → 422, estado inalterado', async () => {
      const id = await emAnalise();
      const antes = await linha(id);

      const resposta = await rejeitar(id, {});

      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual({
        statusCode: 422,
        message: 'Campo obrigatório',
        errors: [{ campo: 'motivo', mensagem: 'Campo obrigatório' }],
      });
      expect(await linha(id)).toEqual(antes);
    });

    it('envio de e-mail falhando → 204, decisão gravada e e-mail na fila de reenvio', async () => {
      const id = await emAnalise();
      transporte.forceFailure();

      const resposta = await rejeitar(id, { motivo: MOTIVO });

      expect(resposta.status).toBe(204);
      expect((await linha(id)).status).toBe('REJEITADA');
      expect(await contexto.prisma.emailPendente.findMany()).toMatchObject([
        {
          para: dona.usuario.email,
          template: TemplateEmail.CAMPANHA_REJEITADA,
          dados: { nomeCampanha: 'Café que Educa', motivo: MOTIVO },
          enviadoEm: null,
        },
      ]);
    });

    it('campanha em RASCUNHO → 409, nada gravado e nenhum e-mail', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(instituicao),
      );
      const antes = await linha(id);

      const resposta = await rejeitar(id, { motivo: MOTIVO });

      expect(resposta.status).toBe(409);
      expect(resposta.body).toEqual({
        statusCode: 409,
        message: MENSAGEM_TRANSICAO,
      });
      expect(await linha(id)).toEqual(antes);
      expect(transporte.mensagens).toEqual([]);
    });

    it('campanha inexistente → 404', async () => {
      const resposta = await rejeitar(INEXISTENTE, { motivo: MOTIVO });

      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual(NAO_ENCONTRADA);
    });

    it('EMPRESA → 403 sem alterar o estado', async () => {
      const id = await emAnalise();
      const antes = await linha(id);

      const resposta = await comCookieDeSessao(
        cenario
          .api()
          .post(`/admin/campanhas/${id}/rejeicao`)
          .send({ motivo: MOTIVO }),
        dona.token,
      );

      expect(resposta.status).toBe(403);
      expect(await linha(id)).toEqual(antes);
      expect(transporte.mensagens).toEqual([]);
    });
  });
});
