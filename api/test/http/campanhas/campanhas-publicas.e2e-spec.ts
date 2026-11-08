import { Storage } from '@domain/fivo/shared/ports/storage';
import { Causa } from '@domain/fivo/catalogo/entities/causa';
import { EmpresaStatus } from '@domain/fivo/empresas/entities/empresa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/catalogo/entities/instituicao';
import { UserRole } from '@domain/fivo/identidade/entities/user';
import { FakeStorage } from '@test/doubles/fake-storage';
import {
  CenarioCampanhas,
  EmpresaDeTeste,
  corpoCompleto,
  diaRelativo,
  jpegBuffer,
  pngBuffer,
} from '@test/http/campanhas/campanhas-e2e.helper';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const MOTIVO = 'A regra de doação não confere com a embalagem.';

// Os únicos campos da consulta pública (Consulta pública AC1 e AC3).
const CAMPOS_PUBLICOS = [
  'beneficiada',
  'descricao',
  'empresa',
  'meta',
  'nome',
  'regraDoacao',
  'situacao',
  'temCapa',
  'vigencia',
];

describe('Consulta pública de campanha (e2e)', () => {
  let contexto: AppDeTeste;
  let cenario: CenarioCampanhas;
  const storage = new FakeStorage();
  let tokenAdmin: string;
  let dona: EmpresaDeTeste;
  let instituicao: Instituicao;
  let causa: Causa;

  function consultar(idPublico: string) {
    return cenario.api().get(`/campanhas/publicas/${idPublico}`);
  }

  function capa(idPublico: string) {
    return cenario.api().get(`/campanhas/publicas/${idPublico}/capa`);
  }

  function editar(id: string, corpo: Record<string, unknown>) {
    return comCookieDeSessao(
      cenario.api().patch(`/campanhas/${id}`).send(corpo),
      dona.token,
    );
  }

  async function enviarCapa(id: string, buffer: Buffer, arquivo: string) {
    const resposta = await comCookieDeSessao(
      cenario
        .api()
        .put(`/campanhas/${id}/capa`)
        .attach('capa', buffer, arquivo),
      dona.token,
    );
    expect(resposta.status).toBe(204);
  }

  function aprovada(extra: Record<string, unknown> = {}) {
    return cenario.criarAprovada(
      dona.token,
      tokenAdmin,
      corpoCompleto(instituicao, extra),
    );
  }

  /** 404 de referência: identificador bem formado que não existe. */
  async function corpoDeInexistente(): Promise<string> {
    const resposta = await consultar('00000000-0000-4000-8000-000000000000');
    expect(resposta.status).toBe(404);
    return resposta.text;
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
    tokenAdmin = await cenario.sessaoComPapel(UserRole.ADMIN);
    dona = await cenario.criarEmpresa(EmpresaStatus.APROVADA, 'Café Bom');
    instituicao = await cenario.criarInstituicao(
      InstituicaoStatus.APROVADA,
      'Amigos do Bairro',
    );
    causa = await cenario.criarCausa('Meio ambiente');
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('GET /campanhas/publicas/:idPublico', () => {
    it('campanha aprovada de empresa aprovada → 200 sem sessão, só com os dados públicos', async () => {
      const { idPublico } = await aprovada({
        meta: '5000',
        vigencia: { inicio: '2026-01-01', fim: '2099-12-31' },
      });

      const resposta = await consultar(idPublico);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        nome: 'Café que Educa',
        descricao: 'A cada pacote vendido, R$ 1,00 vai para o reforço escolar.',
        temCapa: false,
        empresa: 'Café Bom',
        beneficiada: { tipo: 'INSTITUICAO', nome: 'Amigos do Bairro' },
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
        meta: '5000.00',
        vigencia: { inicio: '2026-01-01', fim: '2099-12-31' },
        situacao: 'EM_ANDAMENTO',
      });
    });

    it('beneficiada causa e regra percentual → nome e tipo da causa, percentual em string decimal', async () => {
      const { idPublico } = await aprovada({
        instituicaoId: undefined,
        causaId: causa.id.toString(),
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '7.5' },
      });

      const resposta = await consultar(idPublico);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        beneficiada: { tipo: 'CAUSA', nome: 'Meio ambiente' },
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '7.50' },
        meta: null,
      });
    });

    it('omite id interno, motivo de rejeição e valores da alteração pendente', async () => {
      const { id, idPublico } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(instituicao),
      );
      await cenario.submeter(dona.token, id);
      await comCookieDeSessao(
        cenario
          .api()
          .post(`/admin/campanhas/${id}/rejeicao`)
          .send({ motivo: MOTIVO }),
        tokenAdmin,
      );
      await editar(id, { descricao: 'Descrição corrigida' });
      await cenario.submeter(dona.token, id);
      await cenario.aprovar(tokenAdmin, id);
      await editar(id, {
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '33.33' },
      });

      const resposta = await consultar(idPublico);

      expect(resposta.status).toBe(200);
      expect(Object.keys(resposta.body as object).sort()).toEqual(
        CAMPOS_PUBLICOS,
      );
      expect(resposta.text).not.toContain(id);
      expect(resposta.text).not.toContain(idPublico);
      expect(resposta.text).not.toContain(MOTIVO);
      expect(resposta.text).not.toContain('33.33');
      expect(resposta.body).toMatchObject({
        descricao: 'Descrição corrigida',
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
      });
    });

    it('com alteração pendente mostra o compromisso aprovado; depois da aprovação, o novo', async () => {
      const { id, idPublico } = await aprovada();
      await editar(id, {
        causaId: causa.id.toString(),
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '2.50' },
        vigencia: { inicio: '2026-02-01' },
      });

      const pendente = await consultar(idPublico);

      expect(pendente.status).toBe(200);
      expect(pendente.body).toMatchObject({
        beneficiada: { tipo: 'INSTITUICAO', nome: 'Amigos do Bairro' },
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
        vigencia: { inicio: '2026-01-01' },
      });

      await comCookieDeSessao(
        cenario.api().post(`/admin/campanhas/${id}/alteracao/aprovacao`),
        tokenAdmin,
      );
      const aplicada = await consultar(idPublico);

      expect(aplicada.body).toMatchObject({
        beneficiada: { tipo: 'CAUSA', nome: 'Meio ambiente' },
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '2.50' },
        vigencia: { inicio: '2026-02-01' },
      });
    });

    it('edição de texto em campanha aprovada aparece na hora, com o mesmo idPublico', async () => {
      const { id, idPublico } = await aprovada();

      await editar(id, { nome: 'Café que Educa Mais', descricao: 'Nova' });
      const resposta = await consultar(idPublico);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        nome: 'Café que Educa Mais',
        descricao: 'Nova',
      });
    });

    it.each([
      ['amanhã', 1, 'NAO_INICIADA'],
      ['hoje', 0, 'EM_ANDAMENTO'],
      ['ontem', -1, 'EM_ANDAMENTO'],
    ])('início %s → situação %s', async (_rotulo, dias, situacao) => {
      const { idPublico } = await aprovada({
        vigencia: { inicio: diaRelativo(dias) },
      });

      const resposta = await consultar(idPublico);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({ situacao });
    });

    it.each<[string, () => Promise<string>]>([
      [
        'em RASCUNHO',
        async () =>
          (await cenario.criarCampanha(dona.token, corpoCompleto(instituicao)))
            .idPublico,
      ],
      [
        'em EM_ANALISE',
        async () => {
          const { id, idPublico } = await cenario.criarCampanha(
            dona.token,
            corpoCompleto(instituicao),
          );
          await cenario.submeter(dona.token, id);
          return idPublico;
        },
      ],
      [
        'REJEITADA',
        async () => {
          const { id, idPublico } = await cenario.criarCampanha(
            dona.token,
            corpoCompleto(instituicao),
          );
          await cenario.submeter(dona.token, id);
          await comCookieDeSessao(
            cenario
              .api()
              .post(`/admin/campanhas/${id}/rejeicao`)
              .send({ motivo: MOTIVO }),
            tokenAdmin,
          );
          return idPublico;
        },
      ],
      ['malformada', () => Promise.resolve('nao-e-um-uuid')],
      ['com espaço e acento', () => Promise.resolve('campanha%20caf%C3%A9')],
      ['pelo id interno', async () => (await aprovada()).id],
    ])(
      'campanha %s → 404 com o corpo idêntico ao de inexistente',
      async (_rotulo, preparar) => {
        const idPublico = await preparar();
        const referencia = await corpoDeInexistente();

        const resposta = await consultar(idPublico);

        expect(resposta.status).toBe(404);
        expect(resposta.text).toBe(referencia);
        expect(resposta.body).toEqual({
          statusCode: 404,
          message: 'Recurso não encontrado',
        });
      },
    );

    it('empresa suspensa → 404 com o corpo de inexistente, sem mudar o estado da campanha', async () => {
      const { id, idPublico } = await aprovada();
      await cenario.alterarStatusDaEmpresa(
        dona.empresa,
        EmpresaStatus.SUSPENSA,
      );
      const referencia = await corpoDeInexistente();

      const resposta = await consultar(idPublico);

      expect(resposta.status).toBe(404);
      expect(resposta.text).toBe(referencia);
      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id },
      });
      expect(linha.status).toBe('APROVADA');
    });

    it('beneficiada suspensa depois da aprovação → segue publicada com a beneficiada original', async () => {
      const { idPublico } = await aprovada();
      await cenario.alterarStatusDaInstituicao(
        instituicao,
        InstituicaoStatus.SUSPENSA,
      );

      const resposta = await consultar(idPublico);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        beneficiada: { tipo: 'INSTITUICAO', nome: 'Amigos do Bairro' },
      });
    });
  });

  describe('GET /campanhas/publicas/:idPublico/capa', () => {
    it.each([
      ['PNG', 'capa.png', () => pngBuffer(), 'image/png'],
      ['JPEG', 'capa.jpg', () => jpegBuffer(), 'image/jpeg'],
    ])(
      'capa %s de campanha publicada → 200 sem sessão com o Content-Type do arquivo',
      async (_formato, arquivo, gerar, mime) => {
        const { id, idPublico } = await aprovada();
        const buffer = gerar();
        await enviarCapa(id, buffer, arquivo);

        const resposta = await capa(idPublico);

        expect(resposta.status).toBe(200);
        expect(resposta.headers['content-type']).toBe(mime);
        expect(resposta.headers['x-content-type-options']).toBe('nosniff');
        expect(resposta.headers['content-security-policy']).toBe(
          "default-src 'none'; sandbox",
        );
        expect(resposta.headers['content-disposition']).toMatch(/^inline/);
        expect(resposta.body).toEqual(buffer);
        const dados = await consultar(idPublico);
        expect(dados.body).toMatchObject({ temCapa: true });
      },
    );

    it('campanha em RASCUNHO com capa → 404 com o corpo de inexistente', async () => {
      const { id, idPublico } = await cenario.criarCampanha(
        dona.token,
        corpoCompleto(instituicao),
      );
      await enviarCapa(id, pngBuffer(), 'capa.png');
      const referencia = await corpoDeInexistente();

      const resposta = await capa(idPublico);

      expect(resposta.status).toBe(404);
      expect(resposta.text).toBe(referencia);
    });

    it('empresa suspensa com capa → 404 com o corpo de inexistente', async () => {
      const { id, idPublico } = await aprovada();
      await enviarCapa(id, pngBuffer(), 'capa.png');
      await cenario.alterarStatusDaEmpresa(
        dona.empresa,
        EmpresaStatus.SUSPENSA,
      );
      const referencia = await corpoDeInexistente();

      const resposta = await capa(idPublico);

      expect(resposta.status).toBe(404);
      expect(resposta.text).toBe(referencia);
    });

    it.each([
      ['publicada sem capa', true],
      ['com identificador malformado', false],
    ])('campanha %s → 404', async (_rotulo, existe) => {
      const idPublico = existe ? (await aprovada()).idPublico : 'nao-e-uuid';
      const referencia = await corpoDeInexistente();

      const resposta = await capa(idPublico);

      expect(resposta.status).toBe(404);
      expect(resposta.text).toBe(referencia);
    });

    it('storage fora do ar → 503 "Storage indisponível no momento."', async () => {
      const { id, idPublico } = await aprovada();
      await enviarCapa(id, pngBuffer(), 'capa.png');
      storage.forceFailure();

      const resposta = await capa(idPublico);

      expect(resposta.status).toBe(503);
      expect(resposta.body).toEqual({
        statusCode: 503,
        message: 'Storage indisponível no momento.',
      });
    });
  });
});
