import { randomUUID } from 'node:crypto';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { InstituicaoJaExisteError } from '@domain/fivo/catalogo/errors/instituicao-ja-existe.error';
import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { InstituicaoRepository } from '@domain/fivo/catalogo/ports/instituicao-repository';
import { UserRepository } from '@domain/fivo/identidade/ports/user-repository';
import { Cnpj } from '@domain/fivo/shared/entities/cnpj';
import { DocumentoValidacao } from '@domain/fivo/catalogo/entities/documento-validacao';
import {
  Instituicao,
  InstituicaoProps,
  InstituicaoStatus,
} from '@domain/fivo/catalogo/entities/instituicao';
import { UserRole } from '@domain/fivo/identidade/entities/user';
import { CausaFactory } from '@test/factories/causa-factory';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const MOTIVO_REJEICAO =
  'Documento enviado está ilegível e sem data de emissão.';

describe('PrismaInstituicaoRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: InstituicaoRepository;
  let causaId: UniqueEntityId;
  let documentoArquivoId: string;
  let sequenciaCnpj = 1;

  async function criarArquivo(
    tipo: 'DOCUMENTO_INSTITUICAO' | 'LOGO_INSTITUICAO',
  ): Promise<string> {
    const id = randomUUID();

    await contexto.prisma.arquivo.create({
      data: {
        id,
        tipo,
        nomeOriginal: 'arquivo.pdf',
        mime: 'application/pdf',
        bytes: 2048,
        chaveStorage: `${id}/arquivo.pdf`,
      },
    });

    return id;
  }

  async function criarCausa(nome: string): Promise<UniqueEntityId> {
    const causa = CausaFactory.create({ nome });
    await contexto.app.get(CausaRepository).create(causa);
    return causa.id;
  }

  function documento(arquivoId: string, descricao?: string) {
    const resultado = DocumentoValidacao.criar(arquivoId, descricao);

    if (resultado.isLeft()) {
      throw resultado.value;
    }

    return resultado.value;
  }

  /** Instituição com FKs válidas: causa e documento existentes, sem usuário. */
  function nova(props: Partial<InstituicaoProps> = {}): Instituicao {
    return InstituicaoFactory.create({
      cnpj: cnpjValido(sequenciaCnpj++),
      causaId,
      documento: documento(documentoArquivoId),
      usuarioId: null,
      ...props,
    });
  }

  /** Recria a entidade com o mesmo id, trocando só os campos informados. */
  function copiaCom(
    instituicao: Instituicao,
    props: Partial<InstituicaoProps>,
  ): Instituicao {
    return Instituicao.create(
      {
        razaoSocial: instituicao.razaoSocial,
        nomeFantasia: instituicao.nomeFantasia,
        cnpj: instituicao.cnpj,
        telefone: instituicao.telefone,
        cep: instituicao.cep,
        logradouro: instituicao.logradouro,
        numero: instituicao.numero,
        complemento: instituicao.complemento,
        bairro: instituicao.bairro,
        cidade: instituicao.cidade,
        uf: instituicao.uf,
        site: instituicao.site,
        contato: instituicao.contato,
        descricao: instituicao.descricao,
        causaId: instituicao.causaId,
        documento: instituicao.documento,
        usuarioId: instituicao.usuarioId,
        logoArquivoId: instituicao.logoArquivoId,
        status: instituicao.status,
        decididoPor: instituicao.decididoPor,
        decididoEm: instituicao.decididoEm,
        motivoDecisao: instituicao.motivoDecisao,
        createdAt: instituicao.createdAt,
        updatedAt: instituicao.updatedAt,
        ...props,
      },
      instituicao.id,
    );
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(InstituicaoRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    causaId = await criarCausa('Educação');
    documentoArquivoId = await criarArquivo('DOCUMENTO_INSTITUICAO');
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('create seguido de findById devolve uma entidade equivalente', async () => {
    const instituicao = nova({
      razaoSocial: 'Associação Aprender LTDA',
      nomeFantasia: 'Aprender',
      numero: 's/n',
      descricao: 'Reforço escolar gratuito para crianças da periferia.',
      documento: documento(documentoArquivoId, 'Estatuto social registrado'),
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
    });

    await repository.create(instituicao);

    const encontrada = await repository.findById(instituicao.id.toString());

    expect(encontrada).not.toBeNull();
    expect(encontrada!.equals(instituicao)).toBe(true);
    expect(encontrada!.razaoSocial).toBe('Associação Aprender LTDA');
    expect(encontrada!.nomeFantasia).toBe('Aprender');
    expect(encontrada!.cnpj.valor).toBe(instituicao.cnpj.valor);
    expect(encontrada!.telefone).toBe(instituicao.telefone);
    expect(encontrada!.cep).toBe(instituicao.cep);
    expect(encontrada!.logradouro).toBe(instituicao.logradouro);
    expect(encontrada!.numero).toBe('s/n');
    expect(encontrada!.complemento).toBe(instituicao.complemento);
    expect(encontrada!.bairro).toBe(instituicao.bairro);
    expect(encontrada!.cidade).toBe(instituicao.cidade);
    expect(encontrada!.uf).toBe('SP');
    expect(encontrada!.site).toBe(instituicao.site);
    expect(encontrada!.contato).toBe(instituicao.contato);
    expect(encontrada!.descricao).toBe(
      'Reforço escolar gratuito para crianças da periferia.',
    );
    expect(encontrada!.causaId.toString()).toBe(causaId.toString());
    expect(encontrada!.documento.arquivoId.toString()).toBe(documentoArquivoId);
    expect(encontrada!.documento.descricao).toBe('Estatuto social registrado');
    expect(encontrada!.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
    expect(encontrada!.createdAt.getTime()).toBe(
      new Date('2026-05-01T10:00:00.000Z').getTime(),
    );
  });

  it('roundtrip preserva usuário, logo, complemento ausente e colunas de decisão', async () => {
    const user = UserFactory.create({
      email: 'contato@aprender.org',
      role: UserRole.INSTITUICAO,
    });
    await contexto.app.get(UserRepository).create(user);
    const logoId = await criarArquivo('LOGO_INSTITUICAO');
    const adminId = new UniqueEntityId();
    const instituicao = nova({
      usuarioId: user.id,
      logoArquivoId: new UniqueEntityId(logoId),
      complemento: undefined,
      status: InstituicaoStatus.REJEITADA,
      decididoPor: adminId,
      decididoEm: new Date('2026-05-03T12:00:00.000Z'),
      motivoDecisao: MOTIVO_REJEICAO,
      updatedAt: new Date('2026-05-03T12:00:00.000Z'),
    });

    await repository.create(instituicao);

    const encontrada = await repository.findById(instituicao.id.toString());

    expect(encontrada!.usuarioId?.toString()).toBe(user.id.toString());
    expect(encontrada!.logoArquivoId?.toString()).toBe(logoId);
    expect(encontrada!.complemento).toBeUndefined();
    expect(encontrada!.documento.descricao).toBeNull();
    expect(encontrada!.status).toBe(InstituicaoStatus.REJEITADA);
    expect(encontrada!.decididoPor?.toString()).toBe(adminId.toString());
    expect(encontrada!.decididoEm?.getTime()).toBe(
      new Date('2026-05-03T12:00:00.000Z').getTime(),
    );
    expect(encontrada!.motivoDecisao).toBe(MOTIVO_REJEICAO);
    expect(encontrada!.updatedAt?.getTime()).toBe(
      new Date('2026-05-03T12:00:00.000Z').getTime(),
    );
  });

  it('findById devolve null quando a instituição não existe', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });

  it('findByCnpj e findByUsuarioId encontram a instituição, e devolvem null quando não há', async () => {
    const user = UserFactory.create({
      email: 'contato@aprender.org',
      role: UserRole.INSTITUICAO,
    });
    await contexto.app.get(UserRepository).create(user);
    const instituicao = nova({ usuarioId: user.id });
    await repository.create(instituicao);

    const porCnpj = await repository.findByCnpj(instituicao.cnpj.valor);
    const porUsuario = await repository.findByUsuarioId(user.id.toString());

    expect(porCnpj?.id.toString()).toBe(instituicao.id.toString());
    expect(porUsuario?.id.toString()).toBe(instituicao.id.toString());
    await expect(
      repository.findByCnpj(cnpjValido(9999).valor),
    ).resolves.toBeNull();
    await expect(repository.findByUsuarioId(randomUUID())).resolves.toBeNull();
  });

  it('listarPorEstado filtra pelo status e ordena por criado_em (asc e desc)', async () => {
    const maisAntiga = nova({
      nomeFantasia: 'Mais antiga',
      createdAt: new Date('2026-01-01T09:00:00.000Z'),
    });
    const maisNova = nova({
      nomeFantasia: 'Mais nova',
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
    });
    const aprovada = nova({
      nomeFantasia: 'Já aprovada',
      status: InstituicaoStatus.APROVADA,
      createdAt: new Date('2026-02-01T09:00:00.000Z'),
    });

    await repository.create(maisNova);
    await repository.create(aprovada);
    await repository.create(maisAntiga);

    const asc = await repository.listarPorEstado(
      InstituicaoStatus.PENDENTE_APROVACAO,
      'asc',
    );
    const desc = await repository.listarPorEstado(
      InstituicaoStatus.PENDENTE_APROVACAO,
      'desc',
    );

    expect(asc.map((item) => item.nomeFantasia)).toEqual([
      'Mais antiga',
      'Mais nova',
    ]);
    expect(desc.map((item) => item.nomeFantasia)).toEqual([
      'Mais nova',
      'Mais antiga',
    ]);
  });

  it('listarAprovadasPorCausa devolve só as APROVADA da causa, na ordem pedida', async () => {
    const outraCausaId = await criarCausa('Saúde');
    await repository.create(
      nova({
        nomeFantasia: 'Aprovada recente',
        status: InstituicaoStatus.APROVADA,
        createdAt: new Date('2026-03-01T09:00:00.000Z'),
      }),
    );
    await repository.create(
      nova({
        nomeFantasia: 'Aprovada antiga',
        status: InstituicaoStatus.APROVADA,
        createdAt: new Date('2026-01-01T09:00:00.000Z'),
      }),
    );
    await repository.create(
      nova({ nomeFantasia: 'Suspensa', status: InstituicaoStatus.SUSPENSA }),
    );
    await repository.create(
      nova({
        nomeFantasia: 'De outra causa',
        status: InstituicaoStatus.APROVADA,
        causaId: outraCausaId,
      }),
    );

    const lista = await repository.listarAprovadasPorCausa(
      causaId.toString(),
      'asc',
    );

    expect(lista.map((item) => item.nomeFantasia)).toEqual([
      'Aprovada antiga',
      'Aprovada recente',
    ]);
  });

  it('salvarTransicao persiste estado, autor e data da decisão e devolve true', async () => {
    const instituicao = nova();
    await repository.create(instituicao);
    const adminId = new UniqueEntityId();
    instituicao.aprovar(adminId);

    const aplicada = await repository.salvarTransicao(
      instituicao,
      InstituicaoStatus.PENDENTE_APROVACAO,
    );

    expect(aplicada).toBe(true);
    const final = await repository.findById(instituicao.id.toString());
    expect(final!.status).toBe(InstituicaoStatus.APROVADA);
    expect(final!.decididoPor?.toString()).toBe(adminId.toString());
    expect(final!.decididoEm?.getTime()).toBe(
      instituicao.decididoEm!.getTime(),
    );
  });

  it('salvarTransicao devolve false quando o estado persistido já mudou, sem gravar nada', async () => {
    const instituicao = nova();
    await repository.create(instituicao);
    const primeiroAdmin = new UniqueEntityId();
    const aprovacao = (await repository.findById(instituicao.id.toString()))!;
    const rejeicao = (await repository.findById(instituicao.id.toString()))!;
    aprovacao.aprovar(primeiroAdmin);
    rejeicao.rejeitar(new UniqueEntityId(), MOTIVO_REJEICAO);

    const primeira = await repository.salvarTransicao(
      aprovacao,
      InstituicaoStatus.PENDENTE_APROVACAO,
    );
    const segunda = await repository.salvarTransicao(
      rejeicao,
      InstituicaoStatus.PENDENTE_APROVACAO,
    );

    expect(primeira).toBe(true);
    expect(segunda).toBe(false);
    const final = await repository.findById(instituicao.id.toString());
    expect(final!.status).toBe(InstituicaoStatus.APROVADA);
    expect(final!.decididoPor?.toString()).toBe(primeiroAdmin.toString());
    expect(final!.motivoDecisao).toBeNull();
  });

  it('duas decisões concorrentes: só uma é aplicada e o estado final é o dela', async () => {
    const instituicao = nova();
    await repository.create(instituicao);
    const aprovacao = (await repository.findById(instituicao.id.toString()))!;
    const rejeicao = (await repository.findById(instituicao.id.toString()))!;
    aprovacao.aprovar(new UniqueEntityId());
    rejeicao.rejeitar(new UniqueEntityId(), MOTIVO_REJEICAO);

    const [aprovou, rejeitou] = await Promise.all([
      repository.salvarTransicao(
        aprovacao,
        InstituicaoStatus.PENDENTE_APROVACAO,
      ),
      repository.salvarTransicao(
        rejeicao,
        InstituicaoStatus.PENDENTE_APROVACAO,
      ),
    ]);

    expect([aprovou, rejeitou].filter(Boolean)).toHaveLength(1);
    const vencedora = aprovou ? aprovacao : rejeicao;
    const final = await repository.findById(instituicao.id.toString());
    expect(final!.status).toBe(vencedora.status);
    expect(final!.decididoPor?.toString()).toBe(
      vencedora.decididoPor!.toString(),
    );
  });

  it('save grava dados cadastrais sem alterar status, decididoPor, decididoEm e motivoDecisao', async () => {
    const instituicao = nova({ nomeFantasia: 'Nome Antigo' });
    await repository.create(instituicao);
    const obsoleta = (await repository.findById(instituicao.id.toString()))!;
    const decidida = (await repository.findById(instituicao.id.toString()))!;
    const adminId = new UniqueEntityId();
    decidida.rejeitar(adminId, MOTIVO_REJEICAO);
    await repository.salvarTransicao(
      decidida,
      InstituicaoStatus.PENDENTE_APROVACAO,
    );

    await repository.save(copiaCom(obsoleta, { nomeFantasia: 'Nome Novo' }));

    const final = await repository.findById(instituicao.id.toString());
    expect(final!.nomeFantasia).toBe('Nome Novo');
    expect(final!.status).toBe(InstituicaoStatus.REJEITADA);
    expect(final!.decididoPor?.toString()).toBe(adminId.toString());
    expect(final!.decididoEm?.getTime()).toBe(decidida.decididoEm!.getTime());
    expect(final!.motivoDecisao).toBe(MOTIVO_REJEICAO);
  });

  it('create com CNPJ já cadastrado em outra instituição falha com InstituicaoJaExisteError (409)', async () => {
    const primeira = nova();
    const segunda = nova({ cnpj: primeira.cnpj });
    await repository.create(primeira);

    await expect(repository.create(segunda)).rejects.toBeInstanceOf(
      InstituicaoJaExisteError,
    );
    await expect(repository.create(segunda)).rejects.toMatchObject({
      status: 409,
      message: 'CNPJ ou e-mail já cadastrado',
    });
    expect(await contexto.prisma.instituicao.count()).toBe(1);
  });

  it('aceita instituição com o mesmo CNPJ de uma empresa (papéis distintos)', async () => {
    const cnpj: Cnpj = cnpjValido(777);
    await contexto.app
      .get(EmpresaRepository)
      .create(EmpresaFactory.create({ cnpj }));
    const instituicao = nova({ cnpj });

    await repository.create(instituicao);

    const encontrada = await repository.findByCnpj(cnpj.valor);
    expect(encontrada?.id.toString()).toBe(instituicao.id.toString());
  });
});
