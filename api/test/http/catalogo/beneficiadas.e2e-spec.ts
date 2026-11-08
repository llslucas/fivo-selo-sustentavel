import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { InstituicaoRepository } from '@domain/fivo/catalogo/ports/instituicao-repository';
import { UserRepository } from '@domain/fivo/identidade/ports/user-repository';
import { Causa, CausaStatus } from '@domain/fivo/catalogo/entities/causa';
import { DocumentoValidacao } from '@domain/fivo/catalogo/entities/documento-validacao';
import { EmpresaStatus } from '@domain/fivo/empresas/entities/empresa';
import {
  Instituicao,
  InstituicaoProps,
  InstituicaoStatus,
} from '@domain/fivo/catalogo/entities/instituicao';
import { User, UserRole } from '@domain/fivo/identidade/entities/user';
import { SessionService } from '@infra/auth/session.service';
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

// Únicos campos que a empresa pode ver de uma beneficiada (INST-10).
const CAMPOS_PUBLICOS = [
  'causa',
  'cidade',
  'descricao',
  'id',
  'logoArquivoId',
  'nome',
  'site',
  'tipo',
  'uf',
];

describe('GET /beneficiadas (e2e)', () => {
  let contexto: AppDeTeste;
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

  async function sessaoDeEmpresa(status: EmpresaStatus): Promise<string> {
    const dono = await criarUsuario(UserRole.EMPRESA, 'empresa@empresa.test');
    await contexto.app.get(EmpresaRepository).create(
      EmpresaFactory.create({
        usuarioId: dono.id,
        cnpj: cnpjValido(900),
        status,
      }),
    );
    return sessaoDe(dono);
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
    props: Partial<InstituicaoProps>,
  ): Promise<Instituicao> {
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
    const documento = DocumentoValidacao.criar(
      documentoId,
      'Estatuto registrado',
    );
    if (documento.isLeft()) {
      throw documento.value;
    }

    const instituicao = InstituicaoFactory.create({
      cnpj: cnpjValido(sequenciaCnpj++),
      causaId: causa.id,
      documento: documento.value,
      usuarioId: null,
      ...props,
    });
    await contexto.app.get(InstituicaoRepository).create(instituicao);
    return instituicao;
  }

  function nomes(corpo: unknown): string[] {
    return (corpo as Array<{ nome: string }>).map(({ nome }) => nome);
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('empresa aprovada → 200 só com instituições APROVADA e causas ATIVA, em ordem alfabética', async () => {
    const educacao = await criarCausa('Educação');
    await criarCausa('Cultura', CausaStatus.INATIVA);
    const aprovada = await criarInstituicao(educacao, {
      nomeFantasia: 'Amigos do Bairro',
      cidade: 'Campinas',
      uf: 'SP',
      descricao: 'Reforço escolar',
      site: 'https://amigos.org',
      status: InstituicaoStatus.APROVADA,
    });
    for (const status of [
      InstituicaoStatus.PENDENTE_APROVACAO,
      InstituicaoStatus.REJEITADA,
      InstituicaoStatus.SUSPENSA,
      InstituicaoStatus.INATIVA,
    ]) {
      await criarInstituicao(educacao, {
        nomeFantasia: `Em ${status}`,
        status,
      });
    }
    const token = await sessaoDeEmpresa(EmpresaStatus.APROVADA);

    const resposta = await comCookieDeSessao(api().get('/beneficiadas'), token);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([
      {
        tipo: 'INSTITUICAO',
        id: aprovada.id.toString(),
        nome: 'Amigos do Bairro',
        causa: 'Educação',
        cidade: 'Campinas',
        uf: 'SP',
        descricao: 'Reforço escolar',
        site: 'https://amigos.org',
        logoArquivoId: null,
      },
      {
        tipo: 'CAUSA',
        id: educacao.id.toString(),
        nome: 'Educação',
        causa: null,
        cidade: null,
        uf: null,
        descricao: 'Descrição de Educação',
        site: null,
        logoArquivoId: null,
      },
    ]);
  });

  it('a resposta nunca traz documento, e-mail, telefone, CNPJ ou dados de decisão', async () => {
    const causa = await criarCausa('Saúde');
    const dona = await criarUsuario(
      UserRole.INSTITUICAO,
      'dona@instituicao.test',
    );
    const admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
    const instituicao = await criarInstituicao(causa, {
      nomeFantasia: 'Casa de Apoio',
      usuarioId: dona.id,
      telefone: '11988887777',
      status: InstituicaoStatus.APROVADA,
      decididoPor: admin.id,
      decididoEm: new Date('2026-10-10T12:00:00Z'),
    });
    const token = await sessaoDeEmpresa(EmpresaStatus.APROVADA);

    const resposta = await comCookieDeSessao(api().get('/beneficiadas'), token);

    expect(resposta.status).toBe(200);
    for (const item of resposta.body as Array<Record<string, unknown>>) {
      expect(Object.keys(item).sort()).toEqual(CAMPOS_PUBLICOS);
    }
    const bruto = JSON.stringify(resposta.body);
    for (const proibido of [
      instituicao.documento.arquivoId.toString(),
      'Estatuto registrado',
      'dona@instituicao.test',
      '11988887777',
      instituicao.cnpj.valor,
      admin.id.toString(),
      '2026-10-10',
    ]) {
      expect([proibido, bruto.includes(proibido)]).toEqual([proibido, false]);
    }
  });

  it('busca com e sem acento, em qualquer caixa, devolve o mesmo resultado parcial', async () => {
    const causa = await criarCausa('Assistência social');
    const fundacao = await criarInstituicao(causa, {
      nomeFantasia: 'Fundação Esperança',
      status: InstituicaoStatus.APROVADA,
    });
    await criarInstituicao(causa, {
      nomeFantasia: 'Lar dos Idosos',
      status: InstituicaoStatus.APROVADA,
    });
    const token = await sessaoDeEmpresa(EmpresaStatus.APROVADA);

    const respostas = await Promise.all(
      ['fundacao', 'Fundação', 'FUNDAÇÃO', 'undaca'].map((busca) =>
        comCookieDeSessao(api().get('/beneficiadas').query({ busca }), token),
      ),
    );

    for (const resposta of respostas) {
      expect(resposta.status).toBe(200);
      expect(
        (resposta.body as Array<{ id: string }>).map(({ id }) => id),
      ).toEqual([fundacao.id.toString()]);
    }
  });

  it('a busca também encontra causas pelo nome', async () => {
    await criarCausa('Educação');
    await criarCausa('Meio ambiente');
    const token = await sessaoDeEmpresa(EmpresaStatus.APROVADA);

    const resposta = await comCookieDeSessao(
      api().get('/beneficiadas').query({ busca: 'educacao' }),
      token,
    );

    expect(resposta.status).toBe(200);
    expect(nomes(resposta.body)).toEqual(['Educação']);
  });

  it('catálogo vazio → 200 com []', async () => {
    await criarCausa('Cultura', CausaStatus.INATIVA);
    const token = await sessaoDeEmpresa(EmpresaStatus.APROVADA);

    const resposta = await comCookieDeSessao(api().get('/beneficiadas'), token);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  it('busca sem resultado → 200 com []', async () => {
    await criarCausa('Educação');
    const token = await sessaoDeEmpresa(EmpresaStatus.APROVADA);

    const resposta = await comCookieDeSessao(
      api().get('/beneficiadas').query({ busca: 'xyz' }),
      token,
    );

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  it('empresa pendente de aprovação → 403', async () => {
    await criarCausa('Educação');
    const token = await sessaoDeEmpresa(EmpresaStatus.PENDENTE_APROVACAO);

    const resposta = await comCookieDeSessao(api().get('/beneficiadas'), token);

    expect(resposta.status).toBe(403);
  });

  it.each([UserRole.ADMIN, UserRole.INSTITUICAO])(
    'papel %s → 403',
    async (role) => {
      const token = await sessaoDe(await criarUsuario(role, 'outro@fivo.test'));

      const resposta = await comCookieDeSessao(
        api().get('/beneficiadas'),
        token,
      );

      expect(resposta.status).toBe(403);
    },
  );

  it('sem sessão → 401', async () => {
    const resposta = await api().get('/beneficiadas');

    expect(resposta.status).toBe(401);
  });

  it('instituição suspensa ou inativada pelo admin some do catálogo', async () => {
    const causa = await criarCausa('Esporte');
    const suspensa = await criarInstituicao(causa, {
      nomeFantasia: 'Clube Suspenso',
      status: InstituicaoStatus.APROVADA,
    });
    const inativada = await criarInstituicao(causa, {
      nomeFantasia: 'Clube Inativado',
      status: InstituicaoStatus.APROVADA,
    });
    const tokenEmpresa = await sessaoDeEmpresa(EmpresaStatus.APROVADA);
    const tokenAdmin = await sessaoDe(
      await criarUsuario(UserRole.ADMIN, 'admin@fivo.test'),
    );
    const catalogo = async () =>
      nomes(
        (await comCookieDeSessao(api().get('/beneficiadas'), tokenEmpresa))
          .body,
      );
    expect(await catalogo()).toEqual([
      'Clube Inativado',
      'Clube Suspenso',
      'Esporte',
    ]);

    await comCookieDeSessao(
      api().post(`/admin/instituicoes/${suspensa.id.toString()}/suspensao`),
      tokenAdmin,
    ).expect(204);
    await comCookieDeSessao(
      api().post(`/admin/instituicoes/${inativada.id.toString()}/inativacao`),
      tokenAdmin,
    ).expect(204);

    expect(await catalogo()).toEqual(['Esporte']);
  });
});
