import { CampanhaRepository } from '@domain/fivo/application/ports/database/campanha-repository';
import { Storage } from '@domain/fivo/application/ports/storage';
import { Causa, CausaStatus } from '@domain/fivo/entities/causa';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeStorage } from '@test/cryptography/fake-storage';
import {
  CINCO_MB,
  CenarioCampanhas,
  EmpresaDeTeste,
  SVG,
  corpoCompleto,
  diaRelativo,
  jpegBuffer,
  pngBuffer,
  pngComTamanho,
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
  const storage = new FakeStorage();

  function comoDona<T extends Parameters<typeof comCookieDeSessao>[0]>(
    requisicao: T,
  ) {
    return comCookieDeSessao(requisicao, dona.token);
  }

  async function linhasDeCampanha() {
    return contexto.prisma.campanha.findMany();
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor.overrideProvider(Storage).useValue(storage),
    });
    cenario = new CenarioCampanhas(contexto);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    storage.arquivos.clear();
    storage.resetFailure();
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

  describe('PATCH /campanhas/:id', () => {
    const MOTIVO = 'A regra de doação não confere com a embalagem.';

    async function linha(id: string) {
      return contexto.prisma.campanha.findUniqueOrThrow({ where: { id } });
    }

    function editar(id: string, corpo: Record<string, unknown>) {
      return comoDona(cenario.api().patch(`/campanhas/${id}`).send(corpo));
    }

    async function aprovada(): Promise<{ id: string; idPublico: string }> {
      const campanha = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao, { meta: '500.00' }),
      );
      await cenario.forcarEstado(campanha.id, 'APROVADA');
      return campanha;
    }

    function recente(data: Date | string): boolean {
      return Math.abs(Date.now() - new Date(data).getTime()) < 60_000;
    }

    it('RASCUNHO → 200 com todos os campos editados e o idPublico intacto', async () => {
      const { id, idPublico } = await cenario.criarCampanha(dona.token, {
        nome: 'Rascunho',
      });

      const resposta = await editar(id, {
        nome: 'Café Verde',
        descricao: 'Parte da venda vai para o reflorestamento.',
        causaId: catalogo.causa.id.toString(),
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '2.5' },
        meta: '15000',
        vigencia: { inicio: '2026-02-01', fim: '2026-12-31' },
      });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        id,
        idPublico,
        nome: 'Café Verde',
        descricao: 'Parte da venda vai para o reflorestamento.',
        beneficiada: { tipo: 'CAUSA', id: catalogo.causa.id.toString() },
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '2.50' },
        meta: '15000.00',
        vigencia: { inicio: '2026-02-01', fim: '2026-12-31' },
        status: 'RASCUNHO',
        alteracaoPendente: null,
      });
      expect(await linha(id)).toMatchObject({
        nome: 'Café Verde',
        causaId: catalogo.causa.id.toString(),
        regraTipo: 'PERCENTUAL',
        regraPercentualCentesimos: 250,
        metaCentavos: 1500000,
        status: 'RASCUNHO',
        idPublico,
      });
      expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
    });

    it.each<[string, Record<string, unknown>]>([
      ['texto', { descricao: 'Nova descrição' }],
      ['compromisso', { regraDoacao: { tipo: 'POR_UNIDADE', valor: '2.00' } }],
    ])(
      'EM_ANALISE, edição de %s → 409 "Campanha em análise não pode ser editada", nada gravado',
      async (_rotulo, corpo) => {
        const { id } = await cenario.criarCampanha(
          dona.token,
          corpoCompleto(catalogo.instituicao),
        );
        await cenario.forcarEstado(id, 'EM_ANALISE');
        const antes = await linha(id);

        const resposta = await editar(id, corpo);

        expect(resposta.status).toBe(409);
        expect(resposta.body).toEqual({
          statusCode: 409,
          message: 'Campanha em análise não pode ser editada',
        });
        expect(await linha(id)).toEqual(antes);
        expect(await contexto.prisma.campanhaAlteracao.count()).toBe(0);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it('REJEITADA editada → 200, volta a RASCUNHO com o motivo preservado no detalhe e a reabertura auditada', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );
      await cenario.forcarEstado(id, 'REJEITADA', MOTIVO);

      const resposta = await editar(id, { descricao: 'Descrição corrigida' });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        status: 'RASCUNHO',
        descricao: 'Descrição corrigida',
        motivoUltimaRejeicao: MOTIVO,
      });
      const detalhe = await comoDona(cenario.api().get(`/campanhas/${id}`));
      expect(detalhe.body).toMatchObject({
        status: 'RASCUNHO',
        motivoUltimaRejeicao: MOTIVO,
      });
      const [registro] = await contexto.prisma.registroAuditoria.findMany();
      expect(registro).toMatchObject({
        tipo: 'CAMPANHA_REABERTA',
        usuarioId: dona.usuario.id.toString(),
        entidadeId: id,
        dados: { estadoAnterior: 'REJEITADA', estadoNovo: 'RASCUNHO' },
      });
      expect(recente(registro.criadoEm)).toBe(true);
    });

    it('APROVADA, nome, descrição e meta → 200 aplicados na hora, sem alteração pendente', async () => {
      const { id, idPublico } = await aprovada();

      const resposta = await editar(id, {
        nome: 'Café que Educa 2',
        descricao: 'Texto revisado',
        meta: '750.25',
      });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        idPublico,
        nome: 'Café que Educa 2',
        descricao: 'Texto revisado',
        meta: '750.25',
        status: 'APROVADA',
        alteracaoPendente: null,
      });
      expect(await linha(id)).toMatchObject({
        nome: 'Café que Educa 2',
        descricao: 'Texto revisado',
        metaCentavos: 75025,
        status: 'APROVADA',
      });
      expect(await contexto.prisma.campanhaAlteracao.count()).toBe(0);
    });

    it.each<
      [
        string,
        (c: Catalogo) => Record<string, unknown>,
        (c: Catalogo) => Record<string, unknown>,
      ]
    >([
      [
        'regra de doação',
        () => ({ regraDoacao: { tipo: 'PERCENTUAL', percentual: '12.05' } }),
        (c) => ({
          beneficiada: {
            tipo: 'INSTITUICAO',
            id: c.instituicao.id.toString(),
          },
          regraDoacao: { tipo: 'PERCENTUAL', percentual: '12.05' },
          vigencia: { inicio: '2026-01-01' },
        }),
      ],
      [
        'beneficiada',
        (c) => ({ causaId: c.causa.id.toString() }),
        (c) => ({
          beneficiada: { tipo: 'CAUSA', id: c.causa.id.toString() },
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
          vigencia: { inicio: '2026-01-01' },
        }),
      ],
      [
        'vigência',
        () => ({ vigencia: { inicio: '2026-01-01', fim: '2031-01-01' } }),
        (c) => ({
          beneficiada: {
            tipo: 'INSTITUICAO',
            id: c.instituicao.id.toString(),
          },
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
          vigencia: { inicio: '2026-01-01', fim: '2031-01-01' },
        }),
      ],
    ])(
      'APROVADA, nova %s → 200, abre alteração pendente e mantém os valores aprovados',
      async (_rotulo, corpo, proposto) => {
        const { id } = await aprovada();
        const antes = await linha(id);

        const resposta = await editar(id, corpo(catalogo));

        expect(resposta.status).toBe(200);
        const aprovados = {
          beneficiada: {
            tipo: 'INSTITUICAO',
            id: catalogo.instituicao.id.toString(),
          },
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
          vigencia: { inicio: '2026-01-01' },
        };
        expect(resposta.body).toMatchObject({
          status: 'APROVADA',
          ...aprovados,
          alteracaoPendente: {
            ...proposto(catalogo),
            abertaEm: expect.any(String) as string,
          },
        });
        const detalhe = await comoDona(cenario.api().get(`/campanhas/${id}`));
        expect(detalhe.body).toEqual(resposta.body);
        expect(await linha(id)).toMatchObject({
          status: 'APROVADA',
          instituicaoId: antes.instituicaoId,
          causaId: null,
          regraTipo: 'POR_UNIDADE',
          regraValorCentavos: 100,
          dataFim: null,
        });
        const alteracoes = await contexto.prisma.campanhaAlteracao.findMany();
        expect(alteracoes).toHaveLength(1);
        expect(alteracoes[0]).toMatchObject({
          campanhaId: id,
          status: 'EM_ANALISE',
        });
        const [registro] = await contexto.prisma.registroAuditoria.findMany();
        expect(registro).toMatchObject({
          tipo: 'ALTERACAO_CAMPANHA_ABERTA',
          usuarioId: dona.usuario.id.toString(),
          entidadeId: id,
          dados: {
            compromissoAnterior: aprovados,
            compromissoProposto: proposto(catalogo),
          },
        });
        expect(recente(registro.criadoEm)).toBe(true);
      },
    );

    it('APROVADA com alteração pendente, segunda alteração → 409 "Já existe uma alteração em análise", nada gravado', async () => {
      const { id } = await aprovada();
      await editar(id, {
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '2.00' },
      });
      const antes = await linha(id);

      const resposta = await editar(id, {
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '3.00' },
      });

      expect(resposta.status).toBe(409);
      expect(resposta.body).toEqual({
        statusCode: 409,
        message: 'Já existe uma alteração em análise',
      });
      expect(await linha(id)).toEqual(antes);
      const alteracoes = await contexto.prisma.campanhaAlteracao.findMany();
      expect(alteracoes).toHaveLength(1);
      expect(alteracoes[0].regraValorCentavos).toBe(200);
      expect(await contexto.prisma.registroAuditoria.count()).toBe(1);
    });

    it.each<[string, (c: Catalogo) => Record<string, unknown>, string]>([
      [
        'valor inválido',
        () => ({ regraDoacao: { tipo: 'POR_UNIDADE', valor: '0.00' } }),
        MENSAGEM_VALOR,
      ],
      [
        'percentual inválido',
        () => ({ regraDoacao: { tipo: 'PERCENTUAL', percentual: '100.01' } }),
        MENSAGEM_PERCENTUAL,
      ],
      [
        'regra com o valor do outro tipo',
        () => ({ regraDoacao: { tipo: 'PERCENTUAL', valor: '1.00' } }),
        MENSAGEM_OUTRO_TIPO,
      ],
      [
        'instituição e causa juntas',
        (c) => ({
          instituicaoId: c.instituicao.id.toString(),
          causaId: c.causa.id.toString(),
        }),
        MENSAGEM_AMBIGUA,
      ],
      [
        'instituição suspensa',
        (c) => ({ instituicaoId: c.instituicaoSuspensa.id.toString() }),
        MENSAGEM_INDISPONIVEL,
      ],
      [
        'causa inativa',
        (c) => ({ causaId: c.causaInativa.id.toString() }),
        MENSAGEM_INDISPONIVEL,
      ],
      [
        'fim igual ao início',
        () => ({ vigencia: { inicio: '2026-05-01', fim: '2026-05-01' } }),
        MENSAGEM_VIGENCIA,
      ],
      [
        'fim igual a hoje',
        () => ({ vigencia: { inicio: '2020-01-01', fim: diaRelativo(0) } }),
        'A data de fim deve ser posterior à data atual',
      ],
    ])(
      'APROVADA, alteração com %s → 422 com a mensagem da criação, nada gravado',
      async (_rotulo, corpo, mensagem) => {
        const { id } = await aprovada();
        const antes = await linha(id);

        const resposta = await editar(id, corpo(catalogo));

        expect(resposta.status).toBe(422);
        expect(resposta.body).toEqual({ statusCode: 422, message: mensagem });
        expect(await linha(id)).toEqual(antes);
        expect(await contexto.prisma.campanhaAlteracao.count()).toBe(0);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it('APROVADA, alteração com fim amanhã → 200 e alteração aberta', async () => {
      const { id } = await aprovada();

      const resposta = await editar(id, {
        vigencia: { inicio: '2020-01-01', fim: diaRelativo(1) },
      });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        alteracaoPendente: {
          vigencia: { inicio: '2020-01-01', fim: diaRelativo(1) },
        },
      });
      expect(await contexto.prisma.campanhaAlteracao.count()).toBe(1);
    });

    it.each<[string, (c: Catalogo) => Record<string, unknown>, string]>([
      ['nome com 2 caracteres', () => ({ nome: 'ab' }), MENSAGEM_NOME],
      [
        'descrição com 2001 caracteres',
        () => ({ descricao: 'd'.repeat(2001) }),
        MENSAGEM_DESCRICAO,
      ],
      ['meta de R$ 0,00', () => ({ meta: '0.00' }), MENSAGEM_VALOR],
      [
        'instituição pendente',
        (c) => ({ instituicaoId: c.instituicaoPendente.id.toString() }),
        MENSAGEM_INDISPONIVEL,
      ],
      [
        'fim anterior ao início',
        () => ({ vigencia: { inicio: '2026-05-02', fim: '2026-05-01' } }),
        MENSAGEM_VIGENCIA,
      ],
      [
        'data malformada',
        () => ({ vigencia: { inicio: '2026-5-1' } }),
        MENSAGEM_DATA,
      ],
    ])(
      'RASCUNHO com %s → 422 com a mensagem da spec, nada gravado',
      async (_rotulo, corpo, mensagem) => {
        const { id } = await cenario.criarCampanha(dona.token, {
          nome: 'Rascunho',
        });
        const antes = await linha(id);

        const resposta = await editar(id, corpo(catalogo));

        expect(resposta.status).toBe(422);
        expect(resposta.body).toEqual({ statusCode: 422, message: mensagem });
        expect(await linha(id)).toEqual(antes);
      },
    );

    it('campanha de outra empresa → 404 com o corpo de inexistente, nada gravado', async () => {
      const outra = await cenario.criarEmpresa();
      const { id } = await cenario.criarCampanha(outra.token, {
        nome: 'Campanha alheia',
      });
      const antes = await linha(id);

      const resposta = await editar(id, { nome: 'Tomada' });

      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual(NAO_ENCONTRADA);
      expect(await linha(id)).toEqual(antes);
    });

    it('empresa suspensa depois de criar → 403 "Cadastro ainda não aprovado", nada gravado', async () => {
      const { id } = await cenario.criarCampanha(dona.token, {
        nome: 'Rascunho',
      });
      await cenario.alterarStatusDaEmpresa(
        dona.empresa,
        EmpresaStatus.SUSPENSA,
      );
      const antes = await linha(id);

      const resposta = await editar(id, { nome: 'Outro nome' });

      expect(resposta.status).toBe(403);
      expect(resposta.body).toEqual({
        statusCode: 403,
        message: 'Cadastro ainda não aprovado',
      });
      expect(await linha(id)).toEqual(antes);
    });

    it('sem sessão → 401; ADMIN → 403; nada gravado', async () => {
      const { id } = await cenario.criarCampanha(dona.token, {
        nome: 'Rascunho',
      });
      const antes = await linha(id);
      const tokenAdmin = await cenario.sessaoComPapel(UserRole.ADMIN);

      const anonima = await cenario
        .api()
        .patch(`/campanhas/${id}`)
        .send({ nome: 'Outro nome' });
      const admin = await comCookieDeSessao(
        cenario.api().patch(`/campanhas/${id}`).send({ nome: 'Outro nome' }),
        tokenAdmin,
      );

      expect(anonima.status).toBe(401);
      expect(admin.status).toBe(403);
      expect(await linha(id)).toEqual(antes);
    });
  });

  describe('PUT /campanhas/:id/capa', () => {
    const MENSAGEM_LIMITE =
      'Arquivo inválido: tamanho excede o limite de 5 MB.';

    function enviarCapa(
      id: string,
      buffer: Buffer,
      arquivo = 'capa.png',
      token = dona.token,
    ) {
      return comCookieDeSessao(
        cenario
          .api()
          .put(`/campanhas/${id}/capa`)
          .attach('capa', buffer, arquivo),
        token,
      );
    }

    async function capaDe(id: string): Promise<string | null> {
      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id },
      });
      return linha.capaArquivoId;
    }

    async function arquivosGravados() {
      return contexto.prisma.arquivo.findMany({
        where: { tipo: 'IMAGEM_CAMPANHA' },
      });
    }

    function objetosNoStorage(): number {
      return storage.arquivos.size;
    }

    it.each([
      ['PNG', 'capa.png', () => pngBuffer(), 'image/png'],
      ['JPEG', 'capa.jpg', () => jpegBuffer(), 'image/jpeg'],
    ])(
      '%s → 204, capa gravada e vinculada à campanha',
      async (_formato, arquivo, gerar, mime) => {
        const { id } = await cenario.criarCampanha(dona.token, {
          nome: 'Café',
        });
        const buffer = gerar();

        const resposta = await enviarCapa(id, buffer, arquivo);

        expect(resposta.status).toBe(204);
        const [registro] = await arquivosGravados();
        expect(registro).toMatchObject({ mime, bytes: buffer.length });
        expect(await capaDe(id)).toBe(registro.id);
        expect(storage.arquivos.get(registro.chaveStorage)?.buffer).toEqual(
          buffer,
        );
        const detalhe = await comoDona(cenario.api().get(`/campanhas/${id}`));
        expect(detalhe.body).toMatchObject({ capaArquivoId: registro.id });
      },
    );

    it('capa de exatamente 5 MB → 204', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });

      const resposta = await enviarCapa(id, pngComTamanho(CINCO_MB));

      expect(resposta.status).toBe(204);
      const [registro] = await arquivosGravados();
      expect(registro.bytes).toBe(CINCO_MB);
      expect(await capaDe(id)).toBe(registro.id);
    });

    it('capa de 5 MB + 1 byte → 422 com o limite, nada gravado', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });

      const resposta = await enviarCapa(id, pngComTamanho(CINCO_MB + 1));

      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual({
        statusCode: 422,
        message: MENSAGEM_LIMITE,
      });
      expect(await capaDe(id)).toBeNull();
      expect(await arquivosGravados()).toHaveLength(0);
      expect(objetosNoStorage()).toBe(0);
    });

    it.each([
      ['SVG', 'capa.svg', () => Buffer.from(SVG, 'utf-8'), 'image/svg+xml'],
      [
        'PDF chamado .png',
        'capa.png',
        () => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(256)]),
        'application/pdf',
      ],
    ])(
      '%s → 422 identificado pelo conteúdo, nada gravado',
      async (_formato, arquivo, gerar, mime) => {
        const { id } = await cenario.criarCampanha(dona.token, {
          nome: 'Café',
        });

        const resposta = await enviarCapa(id, gerar(), arquivo);

        expect(resposta.status).toBe(422);
        expect(resposta.body).toEqual({
          statusCode: 422,
          message: `Arquivo inválido para IMAGEM_CAMPANHA: formato ${mime} fora da lista aceita. Formatos aceitos: image/png, image/jpeg`,
        });
        expect(await capaDe(id)).toBeNull();
        expect(await arquivosGravados()).toHaveLength(0);
        expect(objetosNoStorage()).toBe(0);
      },
    );

    it('sem o arquivo → 422, nada gravado', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });

      const resposta = await comoDona(
        cenario.api().put(`/campanhas/${id}/capa`).field('outro', 'x'),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual({
        statusCode: 422,
        message: 'Campo obrigatório',
        errors: [{ campo: 'capa', mensagem: 'Campo obrigatório' }],
      });
      expect(await capaDe(id)).toBeNull();
    });

    it('storage fora do ar → 503 "Storage indisponível no momento." e a campanha mantém a capa anterior', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });
      await enviarCapa(id, pngBuffer());
      const anterior = await capaDe(id);
      storage.forceFailure();

      const resposta = await enviarCapa(id, jpegBuffer(), 'nova.jpg');

      expect(resposta.status).toBe(503);
      expect(resposta.body).toEqual({
        statusCode: 503,
        message: 'Storage indisponível no momento.',
      });
      expect(await capaDe(id)).toBe(anterior);
      expect((await arquivosGravados()).map(({ id }) => id)).toEqual([
        anterior,
      ]);
    });

    it('troca de capa → a anterior sai do banco e do storage', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });
      await enviarCapa(id, pngBuffer());
      const anterior = await contexto.prisma.arquivo.findUniqueOrThrow({
        where: { id: (await capaDe(id)) as string },
      });

      const resposta = await enviarCapa(id, jpegBuffer(), 'nova.jpg');

      expect(resposta.status).toBe(204);
      const atual = await capaDe(id);
      expect(atual).not.toBe(anterior.id);
      expect((await arquivosGravados()).map(({ id }) => id)).toEqual([atual]);
      expect(storage.arquivos.has(anterior.chaveStorage)).toBe(false);
      expect(objetosNoStorage()).toBe(1);
    });

    it('APROVADA → 204, capa aplicada na hora sem alteração pendente', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );
      await cenario.forcarEstado(id, 'APROVADA');

      const resposta = await enviarCapa(id, pngBuffer());

      expect(resposta.status).toBe(204);
      const [registro] = await arquivosGravados();
      expect(await capaDe(id)).toBe(registro.id);
      expect(await contexto.prisma.campanhaAlteracao.count()).toBe(0);
    });

    it('EM_ANALISE → 409 e a capa nova é removida, a anterior fica', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );
      await enviarCapa(id, pngBuffer());
      const anterior = await capaDe(id);
      await cenario.forcarEstado(id, 'EM_ANALISE');

      const resposta = await enviarCapa(id, jpegBuffer(), 'nova.jpg');

      expect(resposta.status).toBe(409);
      expect(resposta.body).toEqual({
        statusCode: 409,
        message: 'Campanha em análise não pode ser editada',
      });
      expect(await capaDe(id)).toBe(anterior);
      expect((await arquivosGravados()).map(({ id }) => id)).toEqual([
        anterior,
      ]);
      expect(objetosNoStorage()).toBe(1);
    });

    it('falha no salvar (versão concorrente) → 409 e a capa nova é removida', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });
      const salvar = jest
        .spyOn(contexto.app.get(CampanhaRepository), 'salvar')
        .mockResolvedValueOnce(false);

      try {
        const resposta = await enviarCapa(id, pngBuffer());

        expect(resposta.status).toBe(409);
        expect(resposta.body).toEqual({
          statusCode: 409,
          message: 'Operação não permitida para o estado atual',
        });
      } finally {
        salvar.mockRestore();
      }
      expect(await capaDe(id)).toBeNull();
      expect(await arquivosGravados()).toHaveLength(0);
      expect(objetosNoStorage()).toBe(0);
    });

    it('campanha de outra empresa → 404, nada gravado', async () => {
      const outra = await cenario.criarEmpresa();
      const { id } = await cenario.criarCampanha(outra.token, {
        nome: 'Campanha alheia',
      });

      const resposta = await enviarCapa(id, pngBuffer());

      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual(NAO_ENCONTRADA);
      expect(await capaDe(id)).toBeNull();
      expect(await arquivosGravados()).toHaveLength(0);
      expect(objetosNoStorage()).toBe(0);
    });

    it('empresa suspensa → 403 "Cadastro ainda não aprovado", nada gravado', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });
      await cenario.alterarStatusDaEmpresa(
        dona.empresa,
        EmpresaStatus.SUSPENSA,
      );

      const resposta = await enviarCapa(id, pngBuffer());

      expect(resposta.status).toBe(403);
      expect(resposta.body).toEqual({
        statusCode: 403,
        message: 'Cadastro ainda não aprovado',
      });
      expect(await capaDe(id)).toBeNull();
      expect(await arquivosGravados()).toHaveLength(0);
      expect(objetosNoStorage()).toBe(0);
    });

    it('sem sessão → 401; ADMIN → 403; nada gravado', async () => {
      const { id } = await cenario.criarCampanha(dona.token, { nome: 'Café' });
      const tokenAdmin = await cenario.sessaoComPapel(UserRole.ADMIN);

      const anonima = await cenario
        .api()
        .put(`/campanhas/${id}/capa`)
        .attach('capa', pngBuffer(), 'capa.png');
      const admin = await enviarCapa(id, pngBuffer(), 'capa.png', tokenAdmin);

      expect(anonima.status).toBe(401);
      expect(admin.status).toBe(403);
      expect(await capaDe(id)).toBeNull();
      expect(await arquivosGravados()).toHaveLength(0);
    });
  });

  describe('POST /campanhas/:id/submissao', () => {
    const MENSAGEM_PENDENTES =
      'Preencha os campos obrigatórios antes de enviar para análise';
    const MENSAGEM_VENCIDA = 'A data de fim deve ser posterior à data atual';
    const MENSAGEM_TRANSICAO = 'Operação não permitida para o estado atual';

    async function linha(id: string) {
      return contexto.prisma.campanha.findUniqueOrThrow({ where: { id } });
    }

    function submeter(id: string, token = dona.token) {
      return comCookieDeSessao(
        cenario.api().post(`/campanhas/${id}/submissao`),
        token,
      );
    }

    function pendencias(...campos: string[]) {
      return campos.map((campo) => ({ campo, mensagem: 'Campo obrigatório' }));
    }

    it('rascunho completo → 204, EM_ANALISE com a data-hora da submissão e a transição auditada', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );

      const resposta = await submeter(id);

      expect(resposta.status).toBe(204);
      expect(resposta.text).toBe('');
      const gravada = await linha(id);
      expect(gravada.status).toBe('EM_ANALISE');
      expect(
        Math.abs(Date.now() - (gravada.submetidaEm as Date).getTime()),
      ).toBeLessThan(60_000);
      const detalhe = await comoDona(cenario.api().get(`/campanhas/${id}`));
      expect(detalhe.body).toMatchObject({
        status: 'EM_ANALISE',
        submetidaEm: (gravada.submetidaEm as Date).toISOString(),
      });
      const [registro] = await contexto.prisma.registroAuditoria.findMany();
      expect(registro).toMatchObject({
        tipo: 'CAMPANHA_SUBMETIDA',
        usuarioId: dona.usuario.id.toString(),
        entidadeId: id,
        dados: { estadoAnterior: 'RASCUNHO', estadoNovo: 'EM_ANALISE' },
      });
      expect(Math.abs(Date.now() - registro.criadoEm.getTime())).toBeLessThan(
        60_000,
      );
    });

    it('fim amanhã → 204', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao, {
          vigencia: { inicio: '2020-01-01', fim: diaRelativo(1) },
        }),
      );

      const resposta = await submeter(id);

      expect(resposta.status).toBe(204);
      expect((await linha(id)).status).toBe('EM_ANALISE');
    });

    it.each<[string, Record<string, unknown>, string[]]>([
      [
        'só com o nome',
        { nome: 'Café' },
        ['descricao', 'beneficiada', 'regraDoacao', 'vigencia.inicio'],
      ],
      [
        'sem beneficiada e sem vigência',
        {
          nome: 'Café',
          descricao: 'Descrição',
          regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
        },
        ['beneficiada', 'vigencia.inicio'],
      ],
    ])(
      '%s → 422 listando todos os campos pendentes, nada gravado',
      async (_rotulo, corpo, campos) => {
        const { id } = await cenario.criarCampanha(dona.token, corpo);
        const antes = await linha(id);

        const resposta = await submeter(id);

        expect(resposta.status).toBe(422);
        expect(resposta.body).toEqual({
          statusCode: 422,
          message: MENSAGEM_PENDENTES,
          errors: pendencias(...campos),
        });
        expect(await linha(id)).toEqual(antes);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it.each([
      ['ontem', -1],
      ['hoje', 0],
    ])(
      'fim %s → 422 "A data de fim deve ser posterior à data atual", nada gravado',
      async (_rotulo, dias) => {
        const { id } = await cenario.criarCampanha(
          dona.token,
          corpoCompleto(catalogo.instituicao, {
            vigencia: { inicio: '2020-01-01', fim: diaRelativo(dias) },
          }),
        );
        const antes = await linha(id);

        const resposta = await submeter(id);

        expect(resposta.status).toBe(422);
        expect(resposta.body).toEqual({
          statusCode: 422,
          message: MENSAGEM_VENCIDA,
        });
        expect(await linha(id)).toEqual(antes);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it('instituição suspensa depois de salva → 422 "Instituição ou causa indisponível", nada gravado', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );
      await cenario.alterarStatusDaInstituicao(
        catalogo.instituicao,
        InstituicaoStatus.SUSPENSA,
      );
      const antes = await linha(id);

      const resposta = await submeter(id);

      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual({
        statusCode: 422,
        message: MENSAGEM_INDISPONIVEL,
      });
      expect(await linha(id)).toEqual(antes);
      expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
    });

    it('causa inativada depois de salva → 422 "Instituição ou causa indisponível", nada gravado', async () => {
      const { id } = await cenario.criarCampanha(dona.token, {
        ...corpoCompleto(catalogo.instituicao),
        instituicaoId: undefined,
        causaId: catalogo.causa.id.toString(),
      });
      await contexto.prisma.causa.update({
        where: { id: catalogo.causa.id.toString() },
        data: { status: 'INATIVA' },
      });
      const antes = await linha(id);

      const resposta = await submeter(id);

      expect(resposta.status).toBe(422);
      expect(resposta.body).toEqual({
        statusCode: 422,
        message: MENSAGEM_INDISPONIVEL,
      });
      expect(await linha(id)).toEqual(antes);
    });

    it('segunda submissão → 409 "Operação não permitida para o estado atual", uma só submissão registrada', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );
      await submeter(id);
      const antes = await linha(id);

      const resposta = await submeter(id);

      expect(resposta.status).toBe(409);
      expect(resposta.body).toEqual({
        statusCode: 409,
        message: MENSAGEM_TRANSICAO,
      });
      expect(await linha(id)).toEqual(antes);
      expect(await contexto.prisma.registroAuditoria.count()).toBe(1);
    });

    it.each(['APROVADA', 'REJEITADA'] as const)(
      'campanha %s → 409 "Operação não permitida para o estado atual", nada gravado',
      async (status) => {
        const { id } = await cenario.criarCampanha(
          dona.token,
          corpoCompleto(catalogo.instituicao),
        );
        await cenario.forcarEstado(
          id,
          status,
          'Motivo da rejeição com mais de vinte caracteres.',
        );
        const antes = await linha(id);

        const resposta = await submeter(id);

        expect(resposta.status).toBe(409);
        expect(resposta.body).toEqual({
          statusCode: 409,
          message: MENSAGEM_TRANSICAO,
        });
        expect(await linha(id)).toEqual(antes);
      },
    );

    it('campanha de outra empresa → 404, nada gravado', async () => {
      const outra = await cenario.criarEmpresa();
      const { id } = await cenario.criarCampanha(
        outra.token,
        corpoCompleto(catalogo.instituicao),
      );
      const antes = await linha(id);

      const resposta = await submeter(id);

      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual(NAO_ENCONTRADA);
      expect(await linha(id)).toEqual(antes);
    });

    it('empresa suspensa → 403 "Cadastro ainda não aprovado", nada gravado', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );
      await cenario.alterarStatusDaEmpresa(
        dona.empresa,
        EmpresaStatus.SUSPENSA,
      );
      const antes = await linha(id);

      const resposta = await submeter(id);

      expect(resposta.status).toBe(403);
      expect(resposta.body).toEqual({
        statusCode: 403,
        message: 'Cadastro ainda não aprovado',
      });
      expect(await linha(id)).toEqual(antes);
    });

    it('sem sessão → 401; ADMIN → 403; nada gravado', async () => {
      const { id } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(catalogo.instituicao),
      );
      const antes = await linha(id);
      const tokenAdmin = await cenario.sessaoComPapel(UserRole.ADMIN);

      const anonima = await cenario.api().post(`/campanhas/${id}/submissao`);
      const admin = await submeter(id, tokenAdmin);

      expect(anonima.status).toBe(401);
      expect(admin.status).toBe(403);
      expect(await linha(id)).toEqual(antes);
    });
  });
});
