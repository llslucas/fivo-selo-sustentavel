import request from 'supertest';
import { PNG } from 'pngjs';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Storage } from '@domain/fivo/application/ports/storage';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { User, UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { SessionService } from '@infra/auth/session.service';
import { FakeStorage } from '@test/cryptography/fake-storage';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

function pngBuffer(largura: number, altura: number): Buffer {
  const png = new PNG({ width: largura, height: altura });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

const SVG_VALIDO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
const SVG_COM_SCRIPT =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

describe('GET /arquivos/:id (e2e)', () => {
  let contexto: AppDeTeste;
  const storage = new FakeStorage();
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

  async function enviar(buffer: Buffer, nome: string): Promise<string> {
    const resultado = await contexto.app.get(ArquivoService).uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: nome,
      buffer,
    });

    if (resultado.isLeft()) {
      throw new Error(resultado.value.message);
    }

    return resultado.value.id;
  }

  async function criarEmpresaComLogo(email: string, arquivoId: string) {
    const dono = await criarUsuario(UserRole.EMPRESA, email);
    await contexto.app.get(EmpresaRepository).create(
      EmpresaFactory.create({
        usuarioId: dono.id,
        cnpj: cnpjValido(sequenciaCnpj++),
        logoArquivoId: new UniqueEntityId(arquivoId),
      }),
    );
    return dono;
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor.overrideProvider(Storage).useValue(storage),
    });
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    storage.arquivos.clear();
    storage.resetFailure();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('dono → 200 com os bytes, o Content-Type do registro e nosniff', async () => {
    const png = pngBuffer(512, 512);
    const arquivoId = await enviar(png, 'logo.png');
    const dono = await criarEmpresaComLogo('dona@empresa.test', arquivoId);

    const resposta = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(dono),
    );

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toBe('image/png');
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(resposta.body as Buffer, png)).toBe(0);
  });

  it('ADMIN acessa o arquivo de qualquer empresa → 200', async () => {
    const png = pngBuffer(512, 512);
    const arquivoId = await enviar(png, 'logo.png');
    await criarEmpresaComLogo('dona@empresa.test', arquivoId);
    const admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');

    const resposta = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(admin),
    );

    expect(resposta.status).toBe(200);
    expect(Buffer.compare(resposta.body as Buffer, png)).toBe(0);
  });

  it('SVG válido é entregue com image/svg+xml e nosniff', async () => {
    const arquivoId = await enviar(Buffer.from(SVG_VALIDO), 'logo.svg');
    const dono = await criarEmpresaComLogo('dona@empresa.test', arquivoId);

    const resposta = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(dono),
    );

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toBe('image/svg+xml');
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
  });

  it('PNG é entregue com CSP sandbox, Content-Disposition inline e nosniff', async () => {
    const arquivoId = await enviar(pngBuffer(512, 512), 'logo.png');
    const dono = await criarEmpresaComLogo('dona@empresa.test', arquivoId);

    const resposta = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(dono),
    );

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-security-policy']).toBe(
      "default-src 'none'; sandbox",
    );
    expect(resposta.headers['content-disposition']).toMatch(/^inline/);
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
  });

  it('SVG é entregue com CSP sandbox e Content-Disposition attachment', async () => {
    const arquivoId = await enviar(Buffer.from(SVG_VALIDO), 'logo.svg');
    const dono = await criarEmpresaComLogo('dona@empresa.test', arquivoId);

    const resposta = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(dono),
    );

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-security-policy']).toBe(
      "default-src 'none'; sandbox",
    );
    expect(resposta.headers['content-disposition']).toMatch(/^attachment/);
  });

  it('outra empresa (não-dono) → 403 sem vazar o conteúdo', async () => {
    const arquivoId = await enviar(pngBuffer(512, 512), 'logo.png');
    await criarEmpresaComLogo('dona@empresa.test', arquivoId);
    const outra = await criarUsuario(UserRole.EMPRESA, 'outra@empresa.test');

    const resposta = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(outra),
    );

    expect(resposta.status).toBe(403);
    expect(resposta.headers['content-type']).toMatch(/application\/json/);
  });

  it('arquivo sem empresa vinculada só é acessível ao ADMIN', async () => {
    const arquivoId = await enviar(pngBuffer(512, 512), 'logo.png');
    const empresa = await criarUsuario(
      UserRole.EMPRESA,
      'qualquer@empresa.test',
    );
    const admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');

    const daEmpresa = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(empresa),
    );
    const doAdmin = await comCookieDeSessao(
      api().get(`/arquivos/${arquivoId}`),
      await sessaoDe(admin),
    );

    expect(daEmpresa.status).toBe(403);
    expect(doAdmin.status).toBe(200);
  });

  it('id inexistente → 404', async () => {
    const usuario = await criarUsuario(UserRole.EMPRESA, 'dona@empresa.test');

    const resposta = await comCookieDeSessao(
      api().get('/arquivos/id-que-nao-existe'),
      await sessaoDe(usuario),
    );

    expect(resposta.status).toBe(404);
  });

  it('sem sessão → 401', async () => {
    const resposta = await api().get('/arquivos/qualquer-id');

    expect(resposta.status).toBe(401);
  });

  it('SVG com script é rejeitado no upload do cadastro (422) e nunca chega à entrega', async () => {
    const resposta = await api()
      .post('/empresas')
      .field('razaoSocial', 'Empresa Teste LTDA')
      .field('nomeFantasia', 'Empresa Teste')
      .field('cnpj', cnpjValido(999).valor)
      .field('email', 'dona@empresa.test')
      .field('senha', 'SenhaForte123')
      .field('telefone', '11999999999')
      .field('cep', '12345678')
      .field('logradouro', 'Rua Teste')
      .field('numero', '123')
      .field('bairro', 'Bairro Teste')
      .field('cidade', 'Cidade Teste')
      .field('uf', 'SP')
      .field('contato', 'João da Silva')
      .attach('logo', Buffer.from(SVG_COM_SCRIPT), {
        filename: 'logo.svg',
        contentType: 'image/svg+xml',
      });

    expect(resposta.status).toBe(422);
    expect(await contexto.prisma.arquivo.count()).toBe(0);
  });
});
