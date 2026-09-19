import request from 'supertest';
import { PNG } from 'pngjs';

import { Mailer } from '@domain/fivo/application/ports/mailer';
import { Storage } from '@domain/fivo/application/ports/storage';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import { User, UserRole } from '@domain/fivo/entities/user';
import { SessionService } from '@infra/auth/session.service';
import { FakeMailer } from '@test/cryptography/fake-mailer';
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

const MOTIVO_VALIDO = 'Documentação do CNPJ não confere com a razão social.';
const RODADAS_DE_CORRIDA = 8;

function pngBuffer(): Buffer {
  const png = new PNG({ width: 512, height: 512 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

function campos(email: string) {
  return {
    razaoSocial: 'Empresa Teste LTDA',
    nomeFantasia: 'Empresa Teste',
    cnpj: '12345678000195',
    email,
    senha: 'SenhaForte123',
    telefone: '11999999999',
    cep: '12345678',
    logradouro: 'Rua Teste',
    numero: '123',
    bairro: 'Bairro Teste',
    cidade: 'Cidade Teste',
    uf: 'SP',
    site: 'https://www.empresateste.com.br',
    contato: 'João da Silva',
  };
}

describe('Concorrência e robustez do cadastro de empresa (e2e)', () => {
  let contexto: AppDeTeste;
  const mailer = new FakeMailer();
  const storage = new FakeStorage();
  let tokenAdmin: string;
  let sequenciaCnpj = 1;

  function api() {
    return request(servidorHttp(contexto));
  }

  async function criarUsuario(role: UserRole, email: string): Promise<User> {
    const user = UserFactory.create({ role, email });
    await contexto.app.get(UserRepository).create(user);
    return user;
  }

  async function criarPendente(email: string): Promise<Empresa> {
    const dono = await criarUsuario(UserRole.EMPRESA, email);
    const empresa = EmpresaFactory.create({
      usuarioId: dono.id,
      cnpj: cnpjValido(sequenciaCnpj++),
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });
    await contexto.app.get(EmpresaRepository).create(empresa);
    return empresa;
  }

  function cadastrar(email: string) {
    const requisicao = api().post('/empresas');
    for (const [campo, valor] of Object.entries(campos(email))) {
      requisicao.field(campo, valor);
    }
    return requisicao;
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor
          .overrideProvider(Mailer)
          .useValue(mailer)
          .overrideProvider(Storage)
          .useValue(storage),
    });
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    mailer.mensagens = [];
    mailer.resetFailure();
    storage.arquivos.clear();
    storage.resetFailure();

    const admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
    const { token } = await contexto.app
      .get(SessionService)
      .criar(admin.id.toString());
    tokenAdmin = token;
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('dois cadastros simultâneos com o mesmo CNPJ → exatamente um 201 e um 409, uma só empresa', async () => {
    const [a, b] = await Promise.all([
      cadastrar('a@empresa.test'),
      cadastrar('b@empresa.test'),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await contexto.prisma.empresa.count()).toBe(1);
    expect(await contexto.prisma.usuario.count()).toBe(2); // admin + o dono da empresa criada
  });

  it('aprovação e rejeição concorrentes do mesmo pendente → uma aplica (204), a outra 409, estado final da vencedora, uma auditoria e um e-mail', async () => {
    for (let rodada = 0; rodada < RODADAS_DE_CORRIDA; rodada++) {
      await contexto.prisma.registroAuditoria.deleteMany();
      mailer.mensagens = [];
      const empresa = await criarPendente(`dona${rodada}@empresa.test`);
      const id = empresa.id.toString();

      const [aprovacao, rejeicao] = await Promise.all([
        comCookieDeSessao(
          api().post(`/admin/empresas/${id}/aprovacao`),
          tokenAdmin,
        ),
        comCookieDeSessao(
          api()
            .post(`/admin/empresas/${id}/rejeicao`)
            .send({ motivo: MOTIVO_VALIDO }),
          tokenAdmin,
        ),
      ]);

      expect([aprovacao.status, rejeicao.status].sort()).toEqual([204, 409]);

      const vencedora = aprovacao.status === 204 ? 'aprovacao' : 'rejeicao';
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id },
      });
      expect(linha.status).toBe(
        vencedora === 'aprovacao'
          ? EmpresaStatus.APROVADA
          : EmpresaStatus.REJEITADA,
      );
      expect(await contexto.prisma.registroAuditoria.count()).toBe(1);
      expect(mailer.mensagens).toHaveLength(1);
    }
  });

  async function empresaEm(email: string, status: EmpresaStatus) {
    const empresa = await criarPendente(email);
    await contexto.prisma.empresa.update({
      where: { id: empresa.id.toString() },
      data: { status },
    });
    return empresa.id.toString();
  }

  it.each([
    ['suspensao', EmpresaStatus.APROVADA, EmpresaStatus.SUSPENSA],
    ['reativacao', EmpresaStatus.SUSPENSA, EmpresaStatus.APROVADA],
  ])(
    '%s concorrente da mesma empresa → uma aplica (204), a outra 409, uma auditoria',
    async (rota, inicial, final) => {
      for (let rodada = 0; rodada < RODADAS_DE_CORRIDA; rodada++) {
        await contexto.prisma.registroAuditoria.deleteMany();
        const id = await empresaEm(`dona${rodada}@empresa.test`, inicial);

        const [a, b] = await Promise.all([
          comCookieDeSessao(
            api().post(`/admin/empresas/${id}/${rota}`),
            tokenAdmin,
          ),
          comCookieDeSessao(
            api().post(`/admin/empresas/${id}/${rota}`),
            tokenAdmin,
          ),
        ]);

        expect([a.status, b.status].sort()).toEqual([204, 409]);
        expect(await contexto.prisma.registroAuditoria.count()).toBe(1);
        const linha = await contexto.prisma.empresa.findUniqueOrThrow({
          where: { id },
        });
        expect(linha.status).toBe(final);
      }
    },
  );

  it('re-cadastros simultâneos de uma empresa REJEITADA → exatamente um 201 e um 409; a empresa fica PENDENTE_APROVACAO com o e-mail do vencedor', async () => {
    const dono = await criarUsuario(UserRole.EMPRESA, 'antigo@empresa.test');
    const rejeitada = EmpresaFactory.create({
      usuarioId: dono.id,
      cnpj: Cnpj.create('12345678000195').value as Cnpj,
      status: EmpresaStatus.REJEITADA,
    });
    await contexto.app.get(EmpresaRepository).create(rejeitada);

    const [a, b] = await Promise.all([
      cadastrar('novo-a@empresa.test'),
      cadastrar('novo-b@empresa.test'),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const linha = await contexto.prisma.empresa.findUniqueOrThrow({
      where: { id: rejeitada.id.toString() },
      include: { usuario: true },
    });
    expect(linha.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
    const vencedor = a.status === 201 ? 'novo-a' : 'novo-b';
    expect(linha.usuario?.email).toBe(`${vencedor}@empresa.test`);
  });

  it('storage em falha no upload do logo → 503 e nenhuma linha órfã em usuario, empresa ou arquivo', async () => {
    storage.forceFailure();

    const resposta = await cadastrar('dona@empresa.test').attach(
      'logo',
      pngBuffer(),
      { filename: 'logo.png', contentType: 'image/png' },
    );

    expect(resposta.status).toBe(503);
    expect(await contexto.prisma.empresa.count()).toBe(0);
    expect(await contexto.prisma.arquivo.count()).toBe(0);
    expect(await contexto.prisma.usuario.count()).toBe(1); // só o admin
  });
});
