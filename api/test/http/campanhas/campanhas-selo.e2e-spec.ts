import { randomUUID } from 'node:crypto';

import type { Response } from 'superagent';

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
import { lerQrDoSvg } from '@test/helpers/ler-qr';

const WEB_URL = 'https://fivo.example.com.br';
const NAO_ENCONTRADA = { statusCode: 404, message: 'Campanha não encontrada' };

/** Junta o corpo binário em `res.body` (o supertest não lê `image/*`). */
function comoBuffer(
  resposta: Response,
  pronto: (erro: Error | null, corpo: Buffer) => void,
): void {
  const partes: Buffer[] = [];
  resposta.on('data', (parte: Buffer) => partes.push(parte));
  resposta.on('end', () => pronto(null, Buffer.concat(partes)));
}

describe('GET /campanhas/:id/selo (e2e)', () => {
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

  function pedirSelo(id: string, token: string) {
    return comCookieDeSessao(
      cenario.api().get(`/campanhas/${id}/selo`).buffer(true).parse(comoBuffer),
      token,
    );
  }

  it('campanha aprovada → 200 com os cabeçalhos do contrato e QR da página pública (Selo AC1, AC2)', async () => {
    const { id } = await cenario.criarAprovada(
      dona.token,
      tokenAdmin,
      corpoCompleto(instituicao, { nome: 'Água Limpa' }),
    );

    const resposta = await pedirSelo(id, dona.token);

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toBe('image/svg+xml');
    expect(resposta.headers['content-disposition']).toBe(
      'attachment; filename="selo-agua-limpa.svg"',
    );
    const svg = (resposta.body as Buffer).toString('utf8');
    expect(svg).toContain('Selo Sustentável Fivo');
    expect(lerQrDoSvg(svg)).toBe(`${WEB_URL}/empresa/cafe-bom/agua-limpa`);
  });

  it('campanha em rascunho → 409 "Campanha não está aprovada" (Selo AC6)', async () => {
    const { id } = await cenario.criarCampanha(
      dona.token,
      corpoCompleto(instituicao),
    );

    const resposta = await comCookieDeSessao(
      cenario.api().get(`/campanhas/${id}/selo`),
      dona.token,
    );

    expect(resposta.status).toBe(409);
    expect(resposta.body).toEqual({
      statusCode: 409,
      message: 'Campanha não está aprovada',
    });
  });

  it('campanha aprovada de outra empresa e id inexistente → 404 "Campanha não encontrada", mesmo corpo (Selo AC7)', async () => {
    const outra = await cenario.criarEmpresa(undefined, 'Outra Empresa');
    await contexto.prisma.empresa.update({
      where: { id: outra.empresa.id.toString() },
      data: { slug: 'outra-empresa' },
    });
    const daOutra = await cenario.criarAprovada(
      outra.token,
      tokenAdmin,
      corpoCompleto(instituicao),
    );

    const deOutraEmpresa = await comCookieDeSessao(
      cenario.api().get(`/campanhas/${daOutra.id}/selo`),
      dona.token,
    );
    const inexistente = await comCookieDeSessao(
      cenario.api().get(`/campanhas/${randomUUID()}/selo`),
      dona.token,
    );

    expect(deOutraEmpresa.status).toBe(404);
    expect(deOutraEmpresa.body).toEqual(NAO_ENCONTRADA);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual(NAO_ENCONTRADA);
  });

  it('ADMIN → 403 (Selo AC8)', async () => {
    const { id } = await cenario.criarAprovada(
      dona.token,
      tokenAdmin,
      corpoCompleto(instituicao),
    );

    const resposta = await comCookieDeSessao(
      cenario.api().get(`/campanhas/${id}/selo`),
      tokenAdmin,
    );

    expect(resposta.status).toBe(403);
    expect(resposta.body).toMatchObject({
      statusCode: 403,
      message: 'Acesso negado',
    });
  });
});
