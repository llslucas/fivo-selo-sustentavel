import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import request from 'supertest';

import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Mailer, TemplateEmail } from '@domain/fivo/application/ports/mailer';
import { Storage } from '@domain/fivo/application/ports/storage';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { Causa, CausaStatus } from '@domain/fivo/entities/causa';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { FakeStorage } from '@test/cryptography/fake-storage';
import { CausaFactory } from '@test/factories/causa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

const MB = 1024 * 1024;

function pngBuffer(largura: number, altura: number): Buffer {
  const png = new PNG({ width: largura, height: altura });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

function jpegBuffer(): Buffer {
  const largura = 16;
  const altura = 16;
  return jpeg.encode(
    {
      data: Buffer.alloc(largura * altura * 4, 255),
      width: largura,
      height: altura,
    },
    80,
  ).data;
}

/** PDF reconhecível pelo magic bytes, com `bytes` de tamanho total. */
function pdfBuffer(bytes = 2048): Buffer {
  const cabecalho = Buffer.from('%PDF-1.7\n', 'ascii');
  return Buffer.concat([cabecalho, Buffer.alloc(bytes - cabecalho.length)]);
}

interface Anexo {
  buffer: Buffer;
  nome: string;
  tipo: string;
}

const PDF_VALIDO: Anexo = {
  buffer: pdfBuffer(),
  nome: 'estatuto.pdf',
  tipo: 'application/pdf',
};

function idDaResposta(corpo: unknown): string {
  return (corpo as { id: string }).id;
}

describe('POST /instituicoes (e2e)', () => {
  let contexto: AppDeTeste;
  const mailer = new FakeMailer();
  const storage = new FakeStorage();
  let causa: Causa;

  function campos(sobrescrever: Record<string, string> = {}) {
    return {
      razaoSocial: 'Associação Amigos do Bairro',
      nomeFantasia: 'Amigos do Bairro',
      cnpj: '12345678000195',
      email: 'contato@amigosdobairro.org',
      senha: 'SenhaForte123',
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua das Flores',
      numero: '45',
      bairro: 'Centro',
      cidade: 'Campinas',
      uf: 'SP',
      site: 'https://amigosdobairro.org',
      contato: 'Maria Souza',
      causaId: causa.id.toString(),
      descricao: 'Reforço escolar para crianças do bairro',
      ...sobrescrever,
    };
  }

  function enviarCadastro(
    dados: Record<string, string>,
    anexos: { documento?: Anexo; logo?: Anexo } = { documento: PDF_VALIDO },
  ) {
    const requisicao = request(servidorHttp(contexto)).post('/instituicoes');

    for (const [campo, valor] of Object.entries(dados)) {
      requisicao.field(campo, valor);
    }

    for (const [campo, anexo] of Object.entries(anexos)) {
      requisicao.attach(campo, anexo.buffer, {
        filename: anexo.nome,
        contentType: anexo.tipo,
      });
    }

    return requisicao;
  }

  async function contarLinhas() {
    return {
      usuarios: await contexto.prisma.usuario.count(),
      instituicoes: await contexto.prisma.instituicao.count(),
      arquivos: await contexto.prisma.arquivo.count(),
      noStorage: storage.arquivos.size,
    };
  }

  const NADA_PERSISTIDO = {
    usuarios: 0,
    instituicoes: 0,
    arquivos: 0,
    noStorage: 0,
  };

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
    causa = CausaFactory.create({ nome: 'Educação' });
    await contexto.app.get(CausaRepository).create(causa);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('dados válidos e PDF → 201 com o id; PENDENTE_APROVACAO, papel INSTITUICAO e senha só como hash', async () => {
    const resposta = await enviarCadastro(
      campos({ descricaoDocumento: 'Estatuto social registrado em cartório' }),
    );

    expect(resposta.status).toBe(201);
    const instituicao = await contexto.prisma.instituicao.findUniqueOrThrow({
      where: { id: idDaResposta(resposta.body) },
      include: { usuario: true, documento: true },
    });
    expect(instituicao).toMatchObject({
      status: InstituicaoStatus.PENDENTE_APROVACAO,
      cnpj: '12345678000195',
      causaId: causa.id.toString(),
      descricao: 'Reforço escolar para crianças do bairro',
      documentoDescricao: 'Estatuto social registrado em cartório',
      logoArquivoId: null,
    });
    expect(instituicao.documento).toMatchObject({
      tipo: TipoArquivo.DOCUMENTO_INSTITUICAO,
      mime: 'application/pdf',
    });
    expect(instituicao.usuario?.role).toBe(UserRole.INSTITUICAO);
    expect(instituicao.usuario?.email).toBe('contato@amigosdobairro.org');
    expect(instituicao.usuario?.senhaHash).toMatch(/^\$argon2id\$/);
    expect(instituicao.usuario?.senhaHash).not.toContain('SenhaForte123');
  });

  it.each([
    ['JPG', { buffer: jpegBuffer(), nome: 'doc.jpg', tipo: 'image/jpeg' }],
    ['PNG', { buffer: pngBuffer(20, 20), nome: 'doc.png', tipo: 'image/png' }],
  ])('documento %s → 201', async (_formato, documento) => {
    const resposta = await enviarCadastro(campos(), { documento });

    expect(resposta.status).toBe(201);
    const { documento: arquivo } =
      await contexto.prisma.instituicao.findUniqueOrThrow({
        where: { id: idDaResposta(resposta.body) },
        include: { documento: true },
      });
    expect(arquivo.mime).toBe(documento.tipo);
  });

  it('documento de exatamente 10 MB → 201', async () => {
    const resposta = await enviarCadastro(campos(), {
      documento: { ...PDF_VALIDO, buffer: pdfBuffer(10 * MB) },
    });

    expect(resposta.status).toBe(201);
  });

  it('e-mail de recebimento enviado ao endereço cadastrado', async () => {
    await enviarCadastro(campos()).expect(201);

    expect(mailer.mensagens).toEqual([
      {
        para: 'contato@amigosdobairro.org',
        template: TemplateEmail.CADASTRO_RECEBIDO,
      },
    ]);
  });

  it('com logo PNG 512x512 → 201 e o logo vinculado à instituição', async () => {
    const resposta = await enviarCadastro(campos(), {
      documento: PDF_VALIDO,
      logo: {
        buffer: pngBuffer(512, 512),
        nome: 'logo.png',
        tipo: 'image/png',
      },
    });

    expect(resposta.status).toBe(201);
    const { logo } = await contexto.prisma.instituicao.findUniqueOrThrow({
      where: { id: idDaResposta(resposta.body) },
      include: { logo: true },
    });
    expect(logo).toMatchObject({
      tipo: TipoArquivo.LOGO_INSTITUICAO,
      mime: 'image/png',
    });
  });

  it('logo raster menor que 512x512 → 422 com a dimensão mínima, e o documento enviado é descartado', async () => {
    const resposta = await enviarCadastro(campos(), {
      documento: PDF_VALIDO,
      logo: {
        buffer: pngBuffer(100, 100),
        nome: 'logo.png',
        tipo: 'image/png',
      },
    });

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      message:
        'Arquivo inválido: dimensão mínima de 512x512 pixels para raster.',
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it('CNPJ inválido → 422 "CNPJ inválido" sem persistir nada', async () => {
    const resposta = await enviarCadastro(campos({ cnpj: '11111111111111' }));

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({ message: 'CNPJ inválido' });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it('senha com menos de 10 caracteres → 422 com a mensagem da spec, sem persistir', async () => {
    const resposta = await enviarCadastro(campos({ senha: 'curta123' }));

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      message: 'A senha deve ter no mínimo 10 caracteres',
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it('sem documento → 422 com a mensagem da spec, sem persistir', async () => {
    const resposta = await enviarCadastro(campos(), {});

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      message: 'Anexe um documento que comprove a existência da instituição',
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it('descrição do documento com mais de 200 caracteres → 422, sem persistir', async () => {
    const resposta = await enviarCadastro(
      campos({ descricaoDocumento: 'a'.repeat(201) }),
    );

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      message: 'A descrição do documento deve ter no máximo 200 caracteres',
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it('documento fora dos formatos aceitos (Content-Type mentindo) → 422 informando os formatos, sem persistir', async () => {
    const resposta = await enviarCadastro(campos(), {
      documento: {
        buffer: Buffer.from('isto não é um PDF'),
        nome: 'estatuto.pdf',
        tipo: 'application/pdf',
      },
    });

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      message: expect.stringContaining(
        'Formatos aceitos: application/pdf, image/jpeg, image/png',
      ) as string,
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it('documento acima de 10 MB → 422 informando o limite de 10 MB, e não 413', async () => {
    const resposta = await enviarCadastro(campos(), {
      documento: { ...PDF_VALIDO, buffer: pdfBuffer(10 * MB + 1) },
    });

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      statusCode: 422,
      message: 'Arquivo inválido: tamanho excede o limite de 10 MB.',
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it.each([
    ['inexistente', () => 'causa-que-nao-existe'],
    [
      'inativa',
      async () => {
        const inativa = CausaFactory.create({
          nome: 'Cultura',
          status: CausaStatus.INATIVA,
        });
        await contexto.app.get(CausaRepository).create(inativa);
        return inativa.id.toString();
      },
    ],
  ])(
    'causa %s → 422 "Causa inválida ou inativa", sem persistir',
    async (_caso, causaId) => {
      const resposta = await enviarCadastro(
        campos({ causaId: await causaId() }),
      );

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        message: 'Causa inválida ou inativa',
      });
      expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
    },
  );

  it('CNPJ já cadastrado em outra instituição → 409 "CNPJ ou e-mail já cadastrado"', async () => {
    await enviarCadastro(campos()).expect(201);

    const resposta = await enviarCadastro(
      campos({ email: 'outro@amigosdobairro.org' }),
    );

    expect(resposta.status).toBe(409);
    expect(resposta.body).toMatchObject({
      message: 'CNPJ ou e-mail já cadastrado',
    });
    expect(await contarLinhas()).toEqual({
      usuarios: 1,
      instituicoes: 1,
      arquivos: 1,
      noStorage: 1,
    });
  });

  it('e-mail já usado por uma empresa → 409 "CNPJ ou e-mail já cadastrado"', async () => {
    await contexto.app.get(UserRepository).create(
      UserFactory.create({
        role: UserRole.EMPRESA,
        email: 'contato@amigosdobairro.org',
      }),
    );

    const resposta = await enviarCadastro(campos());

    expect(resposta.status).toBe(409);
    expect(resposta.body).toMatchObject({
      message: 'CNPJ ou e-mail já cadastrado',
    });
    expect(await contexto.prisma.instituicao.count()).toBe(0);
    expect(await contexto.prisma.arquivo.count()).toBe(0);
  });

  it('storage indisponível no envio do documento → 503 com a mensagem da spec e nenhuma instituição criada', async () => {
    storage.forceFailure();

    const resposta = await enviarCadastro(campos());

    expect(resposta.status).toBe(503);
    expect(resposta.body).toMatchObject({
      message: 'Não foi possível enviar o documento, tente novamente',
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });

  it('campo obrigatório ausente → 422 apontando o campo', async () => {
    const { causaId, ...semCausa } = campos();
    void causaId;

    const resposta = await enviarCadastro(semCausa);

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      errors: [{ campo: 'causaId', mensagem: 'Campo obrigatório' }],
    });
    expect(await contarLinhas()).toEqual(NADA_PERSISTIDO);
  });
});
