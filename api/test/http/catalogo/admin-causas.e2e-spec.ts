import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { InstituicaoRepository } from '@domain/fivo/catalogo/ports/instituicao-repository';
import { UserRepository } from '@domain/fivo/identidade/ports/user-repository';
import { Causa, CausaStatus } from '@domain/fivo/catalogo/entities/causa';
import { DocumentoValidacao } from '@domain/fivo/catalogo/entities/documento-validacao';
import { InstituicaoStatus } from '@domain/fivo/catalogo/entities/instituicao';
import { User, UserRole } from '@domain/fivo/identidade/entities/user';
import { SessionService } from '@infra/auth/session.service';
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

const TRANSICAO_INVALIDA = 'Operação não permitida para o estado atual';

describe('AdminCausasController (e2e)', () => {
  let contexto: AppDeTeste;
  let admin: User;
  let tokenAdmin: string;
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

  async function criarCausa(
    nome: string,
    status: CausaStatus = CausaStatus.ATIVA,
  ): Promise<Causa> {
    const causa = CausaFactory.create({
      nome,
      descricao: `Descrição de ${nome}`,
      status,
    });
    await contexto.app.get(CausaRepository).create(causa);
    return causa;
  }

  async function criarInstituicao(
    causa: Causa,
    nomeFantasia: string,
    status: InstituicaoStatus,
  ): Promise<void> {
    const documentoId = randomUUID();
    await contexto.prisma.arquivo.create({
      data: {
        id: documentoId,
        tipo: 'DOCUMENTO_INSTITUICAO',
        nomeOriginal: 'estatuto.pdf',
        mime: 'application/pdf',
        bytes: 2048,
        chaveStorage: `${documentoId}/estatuto.pdf`,
      },
    });
    const documento = DocumentoValidacao.criar(documentoId);
    if (documento.isLeft()) {
      throw documento.value;
    }

    await contexto.app.get(InstituicaoRepository).create(
      InstituicaoFactory.create({
        nomeFantasia,
        cnpj: cnpjValido(sequenciaCnpj++),
        causaId: causa.id,
        documento: documento.value,
        usuarioId: null,
        status,
      }),
    );
  }

  async function causaNoBanco(causa: Causa) {
    return contexto.prisma.causa.findUniqueOrThrow({
      where: { id: causa.id.toString() },
    });
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
    tokenAdmin = await sessaoDe(admin);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('POST /admin/causas', () => {
    it('nome e descrição → 201 com o id; causa persistida como ATIVA', async () => {
      const resposta = await comoAdmin(
        api()
          .post('/admin/causas')
          .send({ nome: 'Educação', descricao: 'Acesso à escola' }),
      );

      expect(resposta.status).toBe(201);
      const { id } = resposta.body as { id: string };
      const linha = await contexto.prisma.causa.findUniqueOrThrow({
        where: { id },
      });
      expect(linha).toMatchObject({
        nome: 'Educação',
        descricao: 'Acesso à escola',
        status: CausaStatus.ATIVA,
      });
    });

    it('nome já existente, mesmo com outra caixa e sem acento → 409 "Causa já cadastrada"', async () => {
      await criarCausa('Educação');

      const resposta = await comoAdmin(
        api()
          .post('/admin/causas')
          .send({ nome: 'EDUCACAO', descricao: 'Outra descrição' }),
      );

      expect(resposta.status).toBe(409);
      expect(resposta.body).toMatchObject({ message: 'Causa já cadastrada' });
      expect(await contexto.prisma.causa.count()).toBe(1);
    });

    it('nome em branco → 422 "Nome da causa inválido" sem persistir', async () => {
      const resposta = await comoAdmin(
        api().post('/admin/causas').send({ nome: '   ', descricao: 'x' }),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: 'Nome da causa inválido',
      });
      expect(await contexto.prisma.causa.count()).toBe(0);
    });

    it('sem o campo nome → 422 apontando o campo', async () => {
      const resposta = await comoAdmin(
        api().post('/admin/causas').send({ descricao: 'x' }),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        errors: [{ campo: 'nome', mensagem: 'Campo obrigatório' }],
      });
      expect(await contexto.prisma.causa.count()).toBe(0);
    });
  });

  describe('PATCH /admin/causas/:id', () => {
    it('edita nome e descrição → 200 com a causa atualizada', async () => {
      const causa = await criarCausa('Saúde');

      const resposta = await comoAdmin(
        api()
          .patch(`/admin/causas/${causa.id.toString()}`)
          .send({ nome: 'Saúde mental', descricao: 'Apoio psicológico' }),
      );

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        id: causa.id.toString(),
        nome: 'Saúde mental',
        descricao: 'Apoio psicológico',
        status: CausaStatus.ATIVA,
      });
      expect(await causaNoBanco(causa)).toMatchObject({
        nome: 'Saúde mental',
        descricao: 'Apoio psicológico',
      });
    });

    it('nome de outra causa → 409 "Causa já cadastrada" sem alterar', async () => {
      await criarCausa('Meio ambiente');
      const causa = await criarCausa('Saúde');

      const resposta = await comoAdmin(
        api()
          .patch(`/admin/causas/${causa.id.toString()}`)
          .send({ nome: 'meio ambiente' }),
      );

      expect(resposta.status).toBe(409);
      expect(resposta.body).toMatchObject({ message: 'Causa já cadastrada' });
      expect((await causaNoBanco(causa)).nome).toBe('Saúde');
    });

    it('causa inativa → 409 sem alterar', async () => {
      const causa = await criarCausa('Saúde', CausaStatus.INATIVA);

      const resposta = await comoAdmin(
        api()
          .patch(`/admin/causas/${causa.id.toString()}`)
          .send({ descricao: 'Nova descrição' }),
      );

      expect(resposta.status).toBe(409);
      expect(resposta.body).toMatchObject({ message: TRANSICAO_INVALIDA });
      expect((await causaNoBanco(causa)).descricao).toBe('Descrição de Saúde');
    });

    it('nome em branco → 422 "Nome da causa inválido" sem alterar', async () => {
      const causa = await criarCausa('Saúde');

      const resposta = await comoAdmin(
        api().patch(`/admin/causas/${causa.id.toString()}`).send({ nome: ' ' }),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: 'Nome da causa inválido',
      });
      expect((await causaNoBanco(causa)).nome).toBe('Saúde');
    });

    it('causa inexistente → 404', async () => {
      const resposta = await comoAdmin(
        api().patch('/admin/causas/id-que-nao-existe').send({ nome: 'X' }),
      );

      expect(resposta.status).toBe(404);
    });
  });

  describe('POST /admin/causas/:id/inativacao', () => {
    it('causa sem instituições aprovadas → 204 e INATIVA, sem excluir o registro', async () => {
      const causa = await criarCausa('Cultura');
      await criarInstituicao(
        causa,
        'Pendente da Cultura',
        InstituicaoStatus.PENDENTE_APROVACAO,
      );

      const resposta = await comoAdmin(
        api().post(`/admin/causas/${causa.id.toString()}/inativacao`),
      );

      expect(resposta.status).toBe(204);
      expect((await causaNoBanco(causa)).status).toBe(CausaStatus.INATIVA);
      expect(await contexto.prisma.causa.count()).toBe(1);
    });

    it('causa com instituições aprovadas → 409 listando só as aprovadas, e a causa segue ATIVA', async () => {
      const causa = await criarCausa('Cultura');
      await criarInstituicao(
        causa,
        'Teatro Aberto',
        InstituicaoStatus.APROVADA,
      );
      await criarInstituicao(
        causa,
        'Coral da Vila',
        InstituicaoStatus.APROVADA,
      );
      await criarInstituicao(
        causa,
        'Biblioteca Pendente',
        InstituicaoStatus.PENDENTE_APROVACAO,
      );

      const resposta = await comoAdmin(
        api().post(`/admin/causas/${causa.id.toString()}/inativacao`),
      );

      expect(resposta.status).toBe(409);
      const corpo = resposta.body as {
        message: string;
        instituicoes: string[];
      };
      expect([...corpo.instituicoes].sort()).toEqual([
        'Coral da Vila',
        'Teatro Aberto',
      ]);
      expect(corpo.message).toContain('Teatro Aberto');
      expect(corpo.message).toContain('Coral da Vila');
      expect(corpo.message).not.toContain('Biblioteca Pendente');
      expect((await causaNoBanco(causa)).status).toBe(CausaStatus.ATIVA);
    });

    it('causa já inativa → 409', async () => {
      const causa = await criarCausa('Cultura', CausaStatus.INATIVA);

      const resposta = await comoAdmin(
        api().post(`/admin/causas/${causa.id.toString()}/inativacao`),
      );

      expect(resposta.status).toBe(409);
      expect(resposta.body).toMatchObject({ message: TRANSICAO_INVALIDA });
    });

    it('causa inexistente → 404', async () => {
      const resposta = await comoAdmin(
        api().post('/admin/causas/id-que-nao-existe/inativacao'),
      );

      expect(resposta.status).toBe(404);
    });
  });

  describe('controle de acesso', () => {
    // Fábricas, não requisições: o supertest abre a conexão ao criar o Test.
    function rotas(causaId: string): Array<[string, () => request.Test]> {
      return [
        [
          'criar',
          () =>
            api().post('/admin/causas').send({ nome: 'Nova', descricao: 'x' }),
        ],
        [
          'editar',
          () =>
            api().patch(`/admin/causas/${causaId}`).send({ nome: 'Trocada' }),
        ],
        ['inativar', () => api().post(`/admin/causas/${causaId}/inativacao`)],
      ];
    }

    it.each([UserRole.EMPRESA, UserRole.INSTITUICAO])(
      '%s em qualquer rota de escrita → 403 sem alterar dado algum',
      async (role) => {
        const causa = await criarCausa('Esporte');
        const token = await sessaoDe(
          await criarUsuario(role, 'intruso@fivo.test'),
        );

        for (const [nome, requisicao] of rotas(causa.id.toString())) {
          const resposta = await comCookieDeSessao(requisicao(), token);

          expect([nome, resposta.status]).toEqual([nome, 403]);
        }

        expect(await contexto.prisma.causa.count()).toBe(1);
        expect(await causaNoBanco(causa)).toMatchObject({
          nome: 'Esporte',
          status: CausaStatus.ATIVA,
        });
        expect(await contexto.prisma.registroAuditoria.count()).toBe(0);
      },
    );

    it('sem sessão → 401 em todas as rotas', async () => {
      const causa = await criarCausa('Esporte');

      for (const [nome, requisicao] of rotas(causa.id.toString())) {
        const resposta = await requisicao();

        expect([nome, resposta.status]).toEqual([nome, 401]);
      }
    });
  });

  it('criação, edição e inativação geram auditoria com o admin como autor e data-hora', async () => {
    const criada = await comoAdmin(
      api().post('/admin/causas').send({ nome: 'Animais', descricao: 'x' }),
    ).expect(201);
    const { id } = criada.body as { id: string };
    await comoAdmin(
      api().patch(`/admin/causas/${id}`).send({ descricao: 'Proteção animal' }),
    ).expect(200);
    await comoAdmin(api().post(`/admin/causas/${id}/inativacao`)).expect(204);

    const registros = await contexto.prisma.registroAuditoria.findMany({
      orderBy: { criadoEm: 'asc' },
    });
    expect(
      registros.map(({ tipo, usuarioId, entidadeId }) => ({
        tipo,
        usuarioId,
        entidadeId,
      })),
    ).toEqual([
      { tipo: 'CAUSA_CRIADA', usuarioId: admin.id.toString(), entidadeId: id },
      { tipo: 'CAUSA_EDITADA', usuarioId: admin.id.toString(), entidadeId: id },
      {
        tipo: 'CAUSA_INATIVADA',
        usuarioId: admin.id.toString(),
        entidadeId: id,
      },
    ]);
    for (const registro of registros) {
      expect(Math.abs(Date.now() - registro.criadoEm.getTime())).toBeLessThan(
        60_000,
      );
    }
  });
});
