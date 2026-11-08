import { Instituicao } from '@domain/fivo/catalogo/entities/instituicao';
import { UserRole } from '@domain/fivo/identidade/entities/user';
import {
  CenarioCampanhas,
  EmpresaDeTeste,
  corpoCompleto,
} from '@test/http/campanhas/campanhas-e2e.helper';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const WEB_URL = 'https://fivo.example.com.br';

describe('GET /campanhas (e2e)', () => {
  const webUrlOriginal = process.env.WEB_URL;
  let contexto: AppDeTeste;
  let cenario: CenarioCampanhas;
  let dona: EmpresaDeTeste;
  let instituicao: Instituicao;
  let tokenAdmin: string;

  beforeAll(async () => {
    process.env.WEB_URL = WEB_URL;
    contexto = await criarAppDeTeste();
    cenario = new CenarioCampanhas(contexto);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    dona = await cenario.criarEmpresa();
    await contexto.prisma.empresa.update({
      where: { id: dona.empresa.id.toString() },
      data: { slug: 'cafe-bom' },
    });
    instituicao = await cenario.criarInstituicao();
    tokenAdmin = await cenario.sessaoComPapel(UserRole.ADMIN);
  });

  afterAll(async () => {
    await contexto.encerrar();
    process.env.WEB_URL = webUrlOriginal;
  });

  async function definirCriacao(id: string, criadoEm: string) {
    await contexto.prisma.campanha.update({
      where: { id },
      data: { criadoEm: new Date(criadoEm) },
    });
  }

  it('200 com só as campanhas da empresa, da mais recente para a mais antiga, nos campos do contrato (Área AC1, AC2, AC3)', async () => {
    const rascunho = await cenario.criarCampanha(dona.token, {
      nome: 'Só o Nome',
    });
    const percentual = await cenario.criarCampanha(
      dona.token,
      corpoCompleto(instituicao, {
        nome: 'Dois e Meio',
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '2.50' },
      }),
    );
    const aprovada = await cenario.criarAprovada(
      dona.token,
      tokenAdmin,
      corpoCompleto(instituicao, { nome: 'Água Limpa' }),
    );
    await definirCriacao(rascunho.id, '2026-01-01T10:00:00Z');
    await definirCriacao(aprovada.id, '2026-01-02T10:00:00Z');
    await definirCriacao(percentual.id, '2026-01-03T10:00:00Z');

    const outra = await cenario.criarEmpresa(undefined, 'Outra Empresa');
    await cenario.criarCampanha(outra.token, { nome: 'Da Outra' });

    const resposta = await comCookieDeSessao(
      cenario.api().get('/campanhas'),
      dona.token,
    );

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([
      {
        id: percentual.id,
        nome: 'Dois e Meio',
        status: 'RASCUNHO',
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '2.50' },
        urlPublica: null,
      },
      {
        id: aprovada.id,
        nome: 'Água Limpa',
        status: 'APROVADA',
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
        urlPublica: `${WEB_URL}/empresa/cafe-bom/agua-limpa`,
      },
      {
        id: rascunho.id,
        nome: 'Só o Nome',
        status: 'RASCUNHO',
        regraDoacao: null,
        urlPublica: null,
      },
    ]);
  });

  it.each(['EM_ANALISE', 'REJEITADA'] as const)(
    'campanha %s → urlPublica null (Área AC3)',
    async (status) => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(instituicao),
      );
      await cenario.forcarEstado(id, status, 'Motivo da decisão');
      await contexto.prisma.campanha.update({
        where: { id },
        data: { slug: 'cafe-que-educa' },
      });

      const resposta = await comCookieDeSessao(
        cenario.api().get('/campanhas'),
        dona.token,
      );

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([
        {
          id,
          nome: 'Café que Educa',
          status,
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
          urlPublica: null,
        },
      ]);
    },
  );

  it('empresa sem campanhas → 200 com lista vazia (Área AC1)', async () => {
    const resposta = await comCookieDeSessao(
      cenario.api().get('/campanhas'),
      dona.token,
    );

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  it.each([UserRole.ADMIN, UserRole.INSTITUICAO])(
    '%s → 403 (Área AC4)',
    async (papel) => {
      const token = await cenario.sessaoComPapel(papel);

      const resposta = await comCookieDeSessao(
        cenario.api().get('/campanhas'),
        token,
      );

      expect(resposta.status).toBe(403);
      expect(resposta.body).toMatchObject({
        statusCode: 403,
        message: 'Acesso negado',
      });
    },
  );

  it('sem sessão → 401', async () => {
    const resposta = await cenario.api().get('/campanhas');

    expect(resposta.status).toBe(401);
  });
});
