import { UserRole } from '@domain/fivo/entities/user';
import { Instituicao } from '@domain/fivo/entities/instituicao';
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
const RODADAS_DE_CORRIDA = 8;
const CONFLITO = {
  statusCode: 409,
  message: 'Operação não permitida para o estado atual',
};

type Metodo = 'get' | 'post' | 'patch' | 'put';

describe('Concorrência e autorização de campanhas (e2e)', () => {
  let contexto: AppDeTeste;
  let cenario: CenarioCampanhas;
  const transporte = new FakeMailer();
  let tokenAdmin: string;
  let dona: EmpresaDeTeste;
  let instituicao: Instituicao;

  function comoAdmin<T extends Parameters<typeof comCookieDeSessao>[0]>(
    requisicao: T,
  ) {
    return comCookieDeSessao(requisicao, tokenAdmin);
  }

  function comoDona<T extends Parameters<typeof comCookieDeSessao>[0]>(
    requisicao: T,
  ) {
    return comCookieDeSessao(requisicao, dona.token);
  }

  async function linha(id: string) {
    return contexto.prisma.campanha.findUniqueOrThrow({ where: { id } });
  }

  async function decisoesAuditadas(entidadeId: string, tipos: string[]) {
    return contexto.prisma.registroAuditoria.count({
      where: { entidadeId, tipo: { in: tipos } },
    });
  }

  async function emAnalise(): Promise<string> {
    const { id } = await cenario.criarCampanha(
      dona.token,
      corpoCompleto(instituicao),
    );
    await cenario.submeter(dona.token, id);
    return id;
  }

  /** Aprovada com alteração da regra para R$ 2,00 por unidade. */
  async function comAlteracao(): Promise<string> {
    const { id } = await cenario.criarAprovada(
      dona.token,
      tokenAdmin,
      corpoCompleto(instituicao),
    );
    const resposta = await comoDona(
      cenario
        .api()
        .patch(`/campanhas/${id}`)
        .send({ regraDoacao: { tipo: 'POR_UNIDADE', valor: '2.00' } }),
    );
    expect(resposta.status).toBe(200);
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
    tokenAdmin = await cenario.sessaoComPapel(UserRole.ADMIN);
    dona = await cenario.criarEmpresa();
    instituicao = await cenario.criarInstituicao();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('corridas', () => {
    it('aprovação e rejeição simultâneas da mesma campanha → um 204 e um 409; vale só a primeira decisão', async () => {
      for (let rodada = 0; rodada < RODADAS_DE_CORRIDA; rodada++) {
        transporte.mensagens = [];
        const id = await emAnalise();

        const [aprovacao, rejeicao] = await Promise.all([
          comoAdmin(cenario.api().post(`/admin/campanhas/${id}/aprovacao`)),
          comoAdmin(
            cenario
              .api()
              .post(`/admin/campanhas/${id}/rejeicao`)
              .send({ motivo: MOTIVO }),
          ),
        ]);

        expect([aprovacao.status, rejeicao.status].sort()).toEqual([204, 409]);
        const perdedora = aprovacao.status === 409 ? aprovacao : rejeicao;
        expect(perdedora.body).toEqual(CONFLITO);
        const aprovou = aprovacao.status === 204;
        const gravada = await linha(id);
        expect(gravada.status).toBe(aprovou ? 'APROVADA' : 'REJEITADA');
        expect(gravada.motivoUltimaRejeicao).toBe(aprovou ? null : MOTIVO);
        expect(
          await decisoesAuditadas(id, [
            'CAMPANHA_APROVADA',
            'CAMPANHA_REJEITADA',
          ]),
        ).toBe(1);
        expect(transporte.mensagens).toHaveLength(aprovou ? 0 : 1);
      }
    });

    it('aprovação e rejeição simultâneas da mesma alteração → um 204 e um 409; vale só a primeira decisão', async () => {
      for (let rodada = 0; rodada < RODADAS_DE_CORRIDA; rodada++) {
        transporte.mensagens = [];
        const id = await comAlteracao();

        const [aprovacao, rejeicao] = await Promise.all([
          comoAdmin(
            cenario.api().post(`/admin/campanhas/${id}/alteracao/aprovacao`),
          ),
          comoAdmin(
            cenario
              .api()
              .post(`/admin/campanhas/${id}/alteracao/rejeicao`)
              .send({ motivo: MOTIVO }),
          ),
        ]);

        expect([aprovacao.status, rejeicao.status].sort()).toEqual([204, 409]);
        const perdedora = aprovacao.status === 409 ? aprovacao : rejeicao;
        expect(perdedora.body).toEqual(CONFLITO);
        const aprovou = aprovacao.status === 204;
        expect((await linha(id)).regraValorCentavos).toBe(aprovou ? 200 : 100);
        const decididas = await contexto.prisma.campanhaAlteracao.findMany({
          where: { campanhaId: id },
        });
        expect(decididas).toHaveLength(1);
        expect(decididas[0].status).toBe(aprovou ? 'APROVADA' : 'REJEITADA');
        expect(
          await decisoesAuditadas(id, [
            'ALTERACAO_CAMPANHA_APROVADA',
            'ALTERACAO_CAMPANHA_REJEITADA',
          ]),
        ).toBe(1);
        expect(transporte.mensagens).toHaveLength(aprovou ? 0 : 1);
      }
    });

    it('duas submissões simultâneas → um 204 e um 409; uma só submissão registrada', async () => {
      for (let rodada = 0; rodada < RODADAS_DE_CORRIDA; rodada++) {
        const { id } = await cenario.criarCampanha(
          dona.token,
          corpoCompleto(instituicao),
        );

        const respostas = await Promise.all([
          comoDona(cenario.api().post(`/campanhas/${id}/submissao`)),
          comoDona(cenario.api().post(`/campanhas/${id}/submissao`)),
        ]);

        expect(respostas.map(({ status }) => status).sort()).toEqual([
          204, 409,
        ]);
        expect(respostas.find(({ status }) => status === 409)?.body).toEqual(
          CONFLITO,
        );
        expect((await linha(id)).status).toBe('EM_ANALISE');
        expect(await decisoesAuditadas(id, ['CAMPANHA_SUBMETIDA'])).toBe(1);
      }
    });

    it('edição de texto simultânea à aprovação da alteração → o compromisso aprovado não é sobrescrito', async () => {
      for (let rodada = 0; rodada < RODADAS_DE_CORRIDA; rodada++) {
        const id = await comAlteracao();

        const [edicao, aprovacao] = await Promise.all([
          comoDona(
            cenario
              .api()
              .patch(`/campanhas/${id}`)
              .send({ nome: `Nome da rodada ${rodada}` }),
          ),
          comoAdmin(
            cenario.api().post(`/admin/campanhas/${id}/alteracao/aprovacao`),
          ),
        ]);

        expect([200, 409]).toContain(edicao.status);
        expect([204, 409]).toContain(aprovacao.status);
        expect([edicao.status, aprovacao.status]).not.toEqual([409, 409]);
        for (const perdedora of [edicao, aprovacao].filter(
          ({ status }) => status === 409,
        )) {
          expect(perdedora.body).toEqual(CONFLITO);
        }
        const gravada = await linha(id);
        const [alteracao] = await contexto.prisma.campanhaAlteracao.findMany({
          where: { campanhaId: id },
        });
        if (aprovacao.status === 204) {
          expect(gravada.regraValorCentavos).toBe(200);
          expect(alteracao.status).toBe('APROVADA');
        } else {
          expect(gravada.regraValorCentavos).toBe(100);
          expect(alteracao.status).toBe('EM_ANALISE');
        }
        expect(gravada.nome).toBe(
          edicao.status === 200 ? `Nome da rodada ${rodada}` : 'Café que Educa',
        );
      }
    });
  });

  describe('papel × rota', () => {
    /**
     * Lidas do documento OpenAPI: uma rota de campanha nova entra no sweep
     * sozinha. As rotas públicas ficam de fora.
     */
    async function rotasDeCampanha(): Promise<{
      daEmpresa: Array<{ metodo: Metodo; caminho: string }>;
      doAdmin: Array<{ metodo: Metodo; caminho: string }>;
    }> {
      const documento = await cenario.api().get('/docs/openapi.json');
      const paths = (documento.body as { paths: Record<string, object> }).paths;
      const rotas = Object.entries(paths).flatMap(([caminho, porMetodo]) =>
        Object.keys(porMetodo).map((metodo) => ({
          metodo: metodo as Metodo,
          caminho,
        })),
      );

      return {
        daEmpresa: rotas.filter(
          ({ caminho }) =>
            /^\/campanhas(\/|$)/.test(caminho) &&
            !caminho.startsWith('/campanhas/publicas'),
        ),
        doAdmin: rotas.filter(({ caminho }) =>
          /^\/admin\/campanhas(\/|$)/.test(caminho),
        ),
      };
    }

    /** Passaria na validação de toda rota de campanha que exige corpo. */
    const CORPO_VALIDO = { nome: 'Trocado', motivo: MOTIVO };

    async function chamar(
      rota: { metodo: Metodo; caminho: string },
      id: string,
      corpo: object,
      token?: string,
    ) {
      const requisicao = cenario
        .api()
        [rota.metodo](rota.caminho.replace('{id}', id))
        .send(corpo);
      return token ? comCookieDeSessao(requisicao, token) : requisicao;
    }

    async function estado() {
      return {
        campanhas: await contexto.prisma.campanha.findMany({
          orderBy: { id: 'asc' },
        }),
        alteracoes: await contexto.prisma.campanhaAlteracao.findMany(),
        auditorias: await contexto.prisma.registroAuditoria.count(),
        arquivos: await contexto.prisma.arquivo.count({
          where: { tipo: 'IMAGEM_CAMPANHA' },
        }),
      };
    }

    it('as rotas de campanha da empresa e do admin são 5 + 5', async () => {
      const { daEmpresa, doAdmin } = await rotasDeCampanha();

      expect(daEmpresa).toHaveLength(5);
      expect(doAdmin).toHaveLength(5);
    });

    it.each([
      ['corpo válido', CORPO_VALIDO],
      ['corpo vazio', {}],
    ])(
      'anônimo → 401 em toda rota de empresa e de admin (%s), sem alterar estado',
      async (_rotulo, corpo) => {
        const id = await emAnalise();
        const antes = await estado();
        const { daEmpresa, doAdmin } = await rotasDeCampanha();

        for (const rota of [...daEmpresa, ...doAdmin]) {
          const resposta = await chamar(rota, id, corpo);

          expect([rota.metodo, rota.caminho, resposta.status]).toEqual([
            rota.metodo,
            rota.caminho,
            401,
          ]);
        }

        expect(await estado()).toEqual(antes);
      },
    );

    it.each([
      [UserRole.EMPRESA, 'doAdmin', 'corpo válido', CORPO_VALIDO],
      [UserRole.EMPRESA, 'doAdmin', 'corpo vazio', {}],
      [UserRole.ADMIN, 'daEmpresa', 'corpo válido', CORPO_VALIDO],
      [UserRole.ADMIN, 'daEmpresa', 'corpo vazio', {}],
      [UserRole.INSTITUICAO, 'daEmpresa', 'corpo válido', CORPO_VALIDO],
      [UserRole.INSTITUICAO, 'daEmpresa', 'corpo vazio', {}],
      [UserRole.INSTITUICAO, 'doAdmin', 'corpo válido', CORPO_VALIDO],
      [UserRole.INSTITUICAO, 'doAdmin', 'corpo vazio', {}],
    ] as const)(
      '%s → 403 em toda rota %s (%s), sem alterar estado',
      async (role, grupo, _rotulo, corpo) => {
        const id = await emAnalise();
        const antes = await estado();
        // A EMPRESA intrusa é a própria dona: aprovada e com campanha.
        const token =
          role === UserRole.EMPRESA
            ? dona.token
            : await cenario.sessaoComPapel(role);
        const rotas = (await rotasDeCampanha())[grupo];

        for (const rota of rotas) {
          const resposta = await chamar(rota, id, corpo, token);

          expect([rota.metodo, rota.caminho, resposta.status]).toEqual([
            rota.metodo,
            rota.caminho,
            403,
          ]);
          expect(resposta.body).toEqual({
            statusCode: 403,
            message: 'Acesso negado',
            error: 'Forbidden',
          });
        }

        expect(await estado()).toEqual(antes);
        expect(transporte.mensagens).toEqual([]);
      },
    );
  });
});
