import { Causa, CausaStatus } from '@domain/fivo/entities/causa';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { UserRole } from '@domain/fivo/entities/user';
import {
  CenarioCampanhas,
  EmpresaDeTeste,
  corpoCompleto,
  diaRelativo,
} from '@test/helpers/campanhas-e2e';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const MENSAGEM_NOME = 'O nome deve ter entre 3 e 80 caracteres';
const MENSAGEM_DESCRICAO = 'A descrição deve ter no máximo 2000 caracteres';
const MENSAGEM_VALOR =
  'O valor deve estar entre R$ 0,01 e R$ 999.999,99, com no máximo 2 casas decimais';
const MENSAGEM_PERCENTUAL =
  'O percentual deve estar entre 0,01% e 100,00%, com no máximo 2 casas decimais';
const MENSAGEM_OUTRO_TIPO =
  'O Valor da regra deve corresponder à regra selecionada.';
const MENSAGEM_AMBIGUA =
  'Informe exatamente uma beneficiada: instituição ou causa';
const MENSAGEM_INDISPONIVEL = 'Instituição ou causa indisponível';
const MENSAGEM_VIGENCIA = 'A data de fim deve ser posterior à data de início';
const MENSAGEM_DATA = 'Data inválida. Use o formato AAAA-MM-DD';

const NAO_ENCONTRADA = { statusCode: 404, message: 'Recurso não encontrado' };

interface Catalogo {
  instituicao: Instituicao;
  causa: Causa;
  instituicaoPendente: Instituicao;
  instituicaoSuspensa: Instituicao;
  causaInativa: Causa;
}

describe('Campanhas da empresa (e2e)', () => {
  let contexto: AppDeTeste;
  let cenario: CenarioCampanhas;
  let dona: EmpresaDeTeste;
  let catalogo: Catalogo;

  function comoDona<T extends Parameters<typeof comCookieDeSessao>[0]>(
    requisicao: T,
  ) {
    return comCookieDeSessao(requisicao, dona.token);
  }

  async function linhasDeCampanha() {
    return contexto.prisma.campanha.findMany();
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    cenario = new CenarioCampanhas(contexto);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    dona = await cenario.criarEmpresa();
    catalogo = {
      instituicao: await cenario.criarInstituicao(),
      causa: await cenario.criarCausa('Meio ambiente'),
      instituicaoPendente: await cenario.criarInstituicao(
        InstituicaoStatus.PENDENTE_APROVACAO,
        'Pendente',
      ),
      instituicaoSuspensa: await cenario.criarInstituicao(
        InstituicaoStatus.SUSPENSA,
        'Suspensa',
      ),
      causaInativa: await cenario.criarCausa('Cultura', CausaStatus.INATIVA),
    };
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('POST /campanhas', () => {
    it('empresa aprovada com só o nome → 201 com id e idPublico distintos; campanha gravada em RASCUNHO', async () => {
      const resposta = await comoDona(
        cenario.api().post('/campanhas').send({ nome: 'Café que Educa' }),
      );

      expect(resposta.status).toBe(201);
      const { id, idPublico } = resposta.body as {
        id: string;
        idPublico: string;
      };
      expect(Object.keys(resposta.body as object).sort()).toEqual([
        'id',
        'idPublico',
      ]);
      expect(idPublico).not.toBe(id);
      expect(idPublico).toMatch(UUID_V4);
      expect(await linhasDeCampanha()).toEqual([
        expect.objectContaining({
          id,
          idPublico,
          empresaId: dona.empresa.id.toString(),
          nome: 'Café que Educa',
          status: 'RASCUNHO',
          descricao: null,
          instituicaoId: null,
          causaId: null,
          regraTipo: null,
          metaCentavos: null,
          dataInicio: null,
          dataFim: null,
          versao: 0,
        }),
      ]);
    });

    it('cada campanha recebe um idPublico próprio, aleatório e não sequencial', async () => {
      const ids: Array<{ id: string; idPublico: string }> = [];
      for (let i = 0; i < 3; i++) {
        ids.push(
          await cenario.criarCampanha(dona.token, { nome: `Campanha ${i}` }),
        );
      }

      const publicos = ids.map(({ idPublico }) => idPublico);
      expect(new Set(publicos).size).toBe(3);
      for (const { id, idPublico } of ids) {
        expect(idPublico).toMatch(UUID_V4);
        expect(idPublico).not.toBe(id);
      }
    });

    it('valores em string decimal e datas AAAA-MM-DD → 201 e gravados em centavos e datas sem deslocamento', async () => {
      const resposta = await comoDona(
        cenario
          .api()
          .post('/campanhas')
          .send(
            corpoCompleto(catalogo.instituicao, {
              regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.05' },
              meta: '25000.5',
              vigencia: { inicio: '2026-01-01', fim: '2027-12-31' },
            }),
          ),
      );

      expect(resposta.status).toBe(201);
      const [linha] = await linhasDeCampanha();
      expect(linha).toMatchObject({
        status: 'RASCUNHO',
        descricao: 'A cada pacote vendido, R$ 1,00 vai para o reforço escolar.',
        instituicaoId: catalogo.instituicao.id.toString(),
        causaId: null,
        regraTipo: 'POR_UNIDADE',
        regraValorCentavos: 105,
        regraPercentualCentesimos: null,
        metaCentavos: 2500050,
      });
      expect(linha.dataInicio?.toISOString().slice(0, 10)).toBe('2026-01-01');
      expect(linha.dataFim?.toISOString().slice(0, 10)).toBe('2027-12-31');
    });

    it('regra percentual para uma causa ativa → 201 com o percentual em centésimos', async () => {
      const resposta = await comoDona(
        cenario
          .api()
          .post('/campanhas')
          .send({
            nome: 'Café Verde',
            causaId: catalogo.causa.id.toString(),
            regraDoacao: { tipo: 'PERCENTUAL', percentual: '12.5' },
          }),
      );

      expect(resposta.status).toBe(201);
      const [linha] = await linhasDeCampanha();
      expect(linha).toMatchObject({
        causaId: catalogo.causa.id.toString(),
        instituicaoId: null,
        regraTipo: 'PERCENTUAL',
        regraPercentualCentesimos: 1250,
        regraValorCentavos: null,
      });
    });

    it('data de início no passado → 201', async () => {
      const resposta = await comoDona(
        cenario
          .api()
          .post('/campanhas')
          .send(
            corpoCompleto(catalogo.instituicao, {
              vigencia: { inicio: diaRelativo(-400) },
            }),
          ),
      );

      expect(resposta.status).toBe(201);
      const [linha] = await linhasDeCampanha();
      expect(linha.dataInicio?.toISOString().slice(0, 10)).toBe(
        diaRelativo(-400),
      );
    });

    it.each<[string, (c: Catalogo) => Record<string, unknown>]>([
      ['nome com 3 caracteres', () => ({ nome: 'Céu' })],
      ['nome com 80 caracteres', () => ({ nome: 'a'.repeat(80) })],
      [
        'nome com 80 caracteres e espaços nas pontas',
        () => ({ nome: `  ${'a'.repeat(80)}  ` }),
      ],
      [
        'descrição com 2000 caracteres',
        () => ({ nome: 'Café', descricao: 'd'.repeat(2000) }),
      ],
      [
        'valor por unidade de R$ 0,01',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '0.01' },
        }),
      ],
      [
        'valor por unidade de R$ 999.999,99',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '999999.99' },
        }),
      ],
      [
        'percentual de 0,01%',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '0.01' },
        }),
      ],
      [
        'percentual de 100,00%',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '100.00' },
        }),
      ],
      ['meta de R$ 0,01', () => ({ nome: 'Café', meta: '0.01' })],
      ['meta de R$ 999.999,99', () => ({ nome: 'Café', meta: '999999.99' })],
      [
        'fim um dia depois do início',
        () => ({
          nome: 'Café',
          vigencia: { inicio: '2026-01-01', fim: '2026-01-02' },
        }),
      ],
    ])('limite aceito: %s → 201', async (_rotulo, corpo) => {
      const resposta = await comoDona(
        cenario.api().post('/campanhas').send(corpo(catalogo)),
      );

      expect(resposta.status).toBe(201);
      expect(await contexto.prisma.campanha.count()).toBe(1);
    });

    it.each<[string, (c: Catalogo) => Record<string, unknown>, string]>([
      ['nome com 2 caracteres', () => ({ nome: 'ab' }), MENSAGEM_NOME],
      [
        'nome com 2 caracteres e espaços nas pontas',
        () => ({ nome: '   ab   ' }),
        MENSAGEM_NOME,
      ],
      [
        'nome com 81 caracteres',
        () => ({ nome: 'a'.repeat(81) }),
        MENSAGEM_NOME,
      ],
      [
        'descrição com 2001 caracteres',
        () => ({ nome: 'Café', descricao: 'd'.repeat(2001) }),
        MENSAGEM_DESCRICAO,
      ],
      [
        'valor por unidade de R$ 0,00',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '0.00' },
        }),
        MENSAGEM_VALOR,
      ],
      [
        'valor por unidade de R$ 1.000.000,00',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1000000.00' },
        }),
        MENSAGEM_VALOR,
      ],
      [
        'valor por unidade com 3 casas decimais',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.005' },
        }),
        MENSAGEM_VALOR,
      ],
      [
        'percentual de 0,00%',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '0.00' },
        }),
        MENSAGEM_PERCENTUAL,
      ],
      [
        'percentual de 100,01%',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '100.01' },
        }),
        MENSAGEM_PERCENTUAL,
      ],
      [
        'percentual com 3 casas decimais',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '12.505' },
        }),
        MENSAGEM_PERCENTUAL,
      ],
      [
        'regra por unidade com percentual',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'POR_UNIDADE', percentual: '10.00' },
        }),
        MENSAGEM_OUTRO_TIPO,
      ],
      [
        'regra percentual com valor em R$',
        () => ({
          nome: 'Café',
          regraDoacao: { tipo: 'PERCENTUAL', valor: '1.00' },
        }),
        MENSAGEM_OUTRO_TIPO,
      ],
      [
        'meta de R$ 0,00',
        () => ({ nome: 'Café', meta: '0.00' }),
        MENSAGEM_VALOR,
      ],
      [
        'meta de R$ 1.000.000,00',
        () => ({ nome: 'Café', meta: '1000000.00' }),
        MENSAGEM_VALOR,
      ],
      [
        'meta com 3 casas decimais',
        () => ({ nome: 'Café', meta: '10.125' }),
        MENSAGEM_VALOR,
      ],
      [
        'instituição e causa ao mesmo tempo',
        (c) => ({
          nome: 'Café',
          instituicaoId: c.instituicao.id.toString(),
          causaId: c.causa.id.toString(),
        }),
        MENSAGEM_AMBIGUA,
      ],
      [
        'instituição pendente de aprovação',
        (c) => ({
          nome: 'Café',
          instituicaoId: c.instituicaoPendente.id.toString(),
        }),
        MENSAGEM_INDISPONIVEL,
      ],
      [
        'instituição suspensa',
        (c) => ({
          nome: 'Café',
          instituicaoId: c.instituicaoSuspensa.id.toString(),
        }),
        MENSAGEM_INDISPONIVEL,
      ],
      [
        'instituição inexistente',
        () => ({
          nome: 'Café',
          instituicaoId: '00000000-0000-4000-8000-000000000000',
        }),
        MENSAGEM_INDISPONIVEL,
      ],
      [
        'causa inativa',
        (c) => ({ nome: 'Café', causaId: c.causaInativa.id.toString() }),
        MENSAGEM_INDISPONIVEL,
      ],
      [
        'fim igual ao início',
        () => ({
          nome: 'Café',
          vigencia: { inicio: '2026-03-10', fim: '2026-03-10' },
        }),
        MENSAGEM_VIGENCIA,
      ],
      [
        'fim anterior ao início',
        () => ({
          nome: 'Café',
          vigencia: { inicio: '2026-03-10', fim: '2026-03-09' },
        }),
        MENSAGEM_VIGENCIA,
      ],
      [
        'data fora do formato AAAA-MM-DD',
        () => ({ nome: 'Café', vigencia: { inicio: '10/03/2026' } }),
        MENSAGEM_DATA,
      ],
      [
        'data inexistente no calendário',
        () => ({ nome: 'Café', vigencia: { inicio: '2026-02-30' } }),
        MENSAGEM_DATA,
      ],
    ])(
      '%s → 422 com a mensagem da spec, nada gravado',
      async (_rotulo, corpo, mensagem) => {
        const resposta = await comoDona(
          cenario.api().post('/campanhas').send(corpo(catalogo)),
        );

        expect(resposta.status).toBe(422);
        expect(resposta.body).toEqual({ statusCode: 422, message: mensagem });
        expect(await contexto.prisma.campanha.count()).toBe(0);
      },
    );

    it('sem nome → 422 da validação de forma, nada gravado', async () => {
      const resposta = await comoDona(
        cenario.api().post('/campanhas').send({ descricao: 'Sem nome' }),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual({
        statusCode: 422,
        message: 'Campo obrigatório',
        errors: [{ campo: 'nome', mensagem: 'Campo obrigatório' }],
      });
      expect(await contexto.prisma.campanha.count()).toBe(0);
    });

    it('sem sessão → 401, nada gravado', async () => {
      const resposta = await cenario
        .api()
        .post('/campanhas')
        .send({ nome: 'Café que Educa' });

      expect(resposta.status).toBe(401);
      expect(await contexto.prisma.campanha.count()).toBe(0);
    });

    it('ADMIN → 403 "Acesso negado", nada gravado', async () => {
      const token = await cenario.sessaoComPapel(UserRole.ADMIN);

      const resposta = await comCookieDeSessao(
        cenario.api().post('/campanhas').send({ nome: 'Café que Educa' }),
        token,
      );

      expect(resposta.status).toBe(403);
      expect(resposta.body).toMatchObject({
        statusCode: 403,
        message: 'Acesso negado',
      });
      expect(await contexto.prisma.campanha.count()).toBe(0);
    });

    it.each([
      EmpresaStatus.PENDENTE_APROVACAO,
      EmpresaStatus.REJEITADA,
      EmpresaStatus.SUSPENSA,
    ])(
      'empresa %s → 403 "Cadastro ainda não aprovado", nada gravado',
      async (status) => {
        const empresa = await cenario.criarEmpresa(status);

        const resposta = await comCookieDeSessao(
          cenario
            .api()
            .post('/campanhas')
            .send(corpoCompleto(catalogo.instituicao)),
          empresa.token,
        );

        expect(resposta.status).toBe(403);
        expect(resposta.body).toEqual({
          statusCode: 403,
          message: 'Cadastro ainda não aprovado',
        });
        expect(await contexto.prisma.campanha.count()).toBe(0);
      },
    );
  });

  describe('GET /campanhas/:id', () => {
    it('dona → 200 com todos os campos, estado, motivo e pendência', async () => {
      const { id, idPublico } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao, {
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.5' },
          meta: '1000',
          vigencia: { inicio: '2026-01-01', fim: '2030-06-30' },
        }),
      );
      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id },
      });

      const resposta = await comoDona(cenario.api().get(`/campanhas/${id}`));

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        id,
        idPublico,
        nome: 'Café que Educa',
        descricao: 'A cada pacote vendido, R$ 1,00 vai para o reforço escolar.',
        capaArquivoId: null,
        beneficiada: {
          tipo: 'INSTITUICAO',
          id: catalogo.instituicao.id.toString(),
        },
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.50' },
        meta: '1000.00',
        vigencia: { inicio: '2026-01-01', fim: '2030-06-30' },
        status: 'RASCUNHO',
        submetidaEm: null,
        motivoUltimaRejeicao: null,
        alteracaoPendente: null,
        criadaEm: linha.criadoEm.toISOString(),
        atualizadaEm: linha.atualizadoEm?.toISOString() ?? null,
      });
    });

    it('descrição com HTML e script volta como o texto enviado', async () => {
      const descricao = '<script>alert("x")</script><b>Café</b> & "aspas"';
      const { id } = await cenario.criarCampanha(dona.token, {
        nome: 'Café',
        descricao,
      });

      const resposta = await comoDona(cenario.api().get(`/campanhas/${id}`));

      expect(resposta.status).toBe(200);
      expect(resposta.headers['content-type']).toMatch(/^application\/json/);
      expect((resposta.body as { descricao: string }).descricao).toBe(
        descricao,
      );
    });

    it('campanha de outra empresa → 404 com o mesmo corpo de uma inexistente', async () => {
      const outra = await cenario.criarEmpresa();
      const { id } = await cenario.criarCampanha(outra.token, {
        nome: 'Campanha alheia',
      });

      const alheia = await comoDona(cenario.api().get(`/campanhas/${id}`));
      const inexistente = await comoDona(
        cenario.api().get('/campanhas/00000000-0000-4000-8000-000000000000'),
      );

      expect(alheia.status).toBe(404);
      expect(alheia.body).toEqual(NAO_ENCONTRADA);
      expect(inexistente.status).toBe(404);
      expect(inexistente.text).toBe(alheia.text);
    });

    it('sem sessão → 401', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });

      const resposta = await cenario.api().get(`/campanhas/${id}`);

      expect(resposta.status).toBe(401);
    });

    it('ADMIN → 403', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });
      const token = await cenario.sessaoComPapel(UserRole.ADMIN);

      const resposta = await comCookieDeSessao(
        cenario.api().get(`/campanhas/${id}`),
        token,
      );

      expect(resposta.status).toBe(403);
    });
  });
});
