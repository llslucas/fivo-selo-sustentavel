import request from 'supertest';

import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Causa, CausaStatus } from '@domain/fivo/entities/causa';
import { UserRole } from '@domain/fivo/entities/user';
import { SessionService } from '@infra/auth/session.service';
import { CausaFactory } from '@test/factories/causa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

describe('GET /causas (e2e)', () => {
  let contexto: AppDeTeste;

  function api() {
    return request(servidorHttp(contexto));
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

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('sem sessão → 200 só com as causas ativas, em ordem alfabética, com id, nome e descrição', async () => {
    const saude = await criarCausa('Saúde');
    const animais = await criarCausa('Animais');
    const educacao = await criarCausa('Educação');
    await criarCausa('Cultura', CausaStatus.INATIVA);

    const resposta = await api().get('/causas');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([
      {
        id: animais.id.toString(),
        nome: 'Animais',
        descricao: 'Descrição de Animais',
      },
      {
        id: educacao.id.toString(),
        nome: 'Educação',
        descricao: 'Descrição de Educação',
      },
      {
        id: saude.id.toString(),
        nome: 'Saúde',
        descricao: 'Descrição de Saúde',
      },
    ]);
  });

  it('causa inativada pelo admin some da resposta', async () => {
    const meioAmbiente = await criarCausa('Meio ambiente');
    const esporte = await criarCausa('Esporte');
    const admin = UserFactory.create({
      role: UserRole.ADMIN,
      email: 'admin@fivo.test',
    });
    await contexto.app.get(UserRepository).create(admin);
    const { token } = await contexto.app
      .get(SessionService)
      .criar(admin.id.toString());

    await comCookieDeSessao(
      api().post(`/admin/causas/${esporte.id.toString()}/inativacao`),
      token,
    ).expect(204);
    const resposta = await api().get('/causas');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([
      {
        id: meioAmbiente.id.toString(),
        nome: 'Meio ambiente',
        descricao: 'Descrição de Meio ambiente',
      },
    ]);
  });
});
