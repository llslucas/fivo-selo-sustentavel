import { randomUUID } from 'node:crypto';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { EmpresaJaExisteError } from '@domain/fivo/empresas/errors/empresa-ja-existe.error';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { UserRepository } from '@domain/fivo/identidade/ports/user-repository';
import { Cnpj } from '@domain/fivo/shared/entities/cnpj';
import { Slug } from '@domain/fivo/shared/entities/slug';
import { SlugEmUsoError } from '@domain/fivo/shared/errors/slug.errors';
import { EmpresaStatus } from '@domain/fivo/empresas/entities/empresa';
import { UserRole } from '@domain/fivo/identidade/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const CNPJ_A = '11223344000186';
const CNPJ_B = '22334455000186';
const CNPJ_C = '33445566000186';
const CNPJ_D = '44556677000186';

function cnpj(digitos: string): Cnpj {
  const resultado = Cnpj.create(digitos);

  if (resultado.isLeft()) {
    throw new Error(`CNPJ de teste inválido: ${digitos}`);
  }

  return resultado.value;
}

describe('PrismaEmpresaRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: EmpresaRepository;
  let userRepository: UserRepository;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(EmpresaRepository);
    userRepository = contexto.app.get(UserRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('create seguido de findById devolve uma entidade equivalente', async () => {
    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      razaoSocial: 'Fivo Comércio LTDA',
      nomeFantasia: 'Fivo',
      numero: 's/n',
      complemento: undefined,
    });

    await repository.create(empresa);

    const encontrada = await repository.findById(empresa.id.toString());

    expect(encontrada).not.toBeNull();
    expect(encontrada!.equals(empresa)).toBe(true);
    expect(encontrada!.razaoSocial).toBe('Fivo Comércio LTDA');
    expect(encontrada!.nomeFantasia).toBe('Fivo');
    expect(encontrada!.cnpj.valor).toBe(CNPJ_A);
    expect(encontrada!.numero).toBe('s/n');
    expect(encontrada!.uf).toBe('SP');
    expect(encontrada!.site).toBe(empresa.site);
    expect(encontrada!.contato).toBe(empresa.contato);
    expect(encontrada!.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
    expect(encontrada!.createdAt.getTime()).toBe(empresa.createdAt.getTime());
    // Endereço e contato completos: nenhuma coluna pode se perder ou trocar de
    // lugar no mapper (EMP-08 AC1 depende de todos eles persistirem).
    expect(encontrada!.telefone).toBe(empresa.telefone);
    expect(encontrada!.cep).toBe(empresa.cep);
    expect(encontrada!.logradouro).toBe(empresa.logradouro);
    expect(encontrada!.bairro).toBe(empresa.bairro);
    expect(encontrada!.cidade).toBe(empresa.cidade);
  });

  it('roundtrip preserva os campos opcionais, de decisão e de troca de e-mail', async () => {
    const arquivoId = randomUUID();

    await contexto.prisma.arquivo.create({
      data: {
        id: arquivoId,
        tipo: 'LOGO_EMPRESA',
        nomeOriginal: 'logo.png',
        mime: 'image/png',
        bytes: 1024,
        largura: 400,
        altura: 400,
        chaveStorage: `logos/${arquivoId}.png`,
      },
    });

    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      complemento: 'Sala 42',
      logoArquivoId: new UniqueEntityId(arquivoId),
      status: EmpresaStatus.REJEITADA,
      decididoPor: new UniqueEntityId(),
      decididoEm: new Date('2026-04-05T11:00:00.000Z'),
      motivoDecisao: 'Documentação fiscal ilegível no comprovante enviado.',
      emailPendente: 'novo-email@empresa.test',
      tokenTrocaEmailHash: 'sha256-do-token-de-troca',
      updatedAt: new Date('2026-04-05T11:00:00.000Z'),
    });

    await repository.create(empresa);

    const encontrada = await repository.findById(empresa.id.toString());

    expect(encontrada!.complemento).toBe('Sala 42');
    expect(encontrada!.logoArquivoId?.toString()).toBe(arquivoId);
    expect(encontrada!.status).toBe(EmpresaStatus.REJEITADA);
    expect(encontrada!.decididoPor?.toString()).toBe(
      empresa.decididoPor!.toString(),
    );
    expect(encontrada!.decididoEm?.getTime()).toBe(
      empresa.decididoEm!.getTime(),
    );
    expect(encontrada!.motivoDecisao).toBe(
      'Documentação fiscal ilegível no comprovante enviado.',
    );
    expect(encontrada!.emailPendente).toBe('novo-email@empresa.test');
    expect(encontrada!.tokenTrocaEmailHash).toBe('sha256-do-token-de-troca');
    expect(encontrada!.updatedAt?.getTime()).toBe(empresa.updatedAt!.getTime());
  });

  it('roundtrip preserva o prazo do link de troca de e-mail', async () => {
    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      emailPendente: 'novo-email@empresa.test',
      tokenTrocaEmailHash: 'sha256-do-token-de-troca',
      tokenTrocaEmailExpiraEm: new Date('2026-04-06T11:00:00.000Z'),
    });

    await repository.create(empresa);

    const encontrada = await repository.findById(empresa.id.toString());
    expect(encontrada!.tokenTrocaEmailExpiraEm?.getTime()).toBe(
      new Date('2026-04-06T11:00:00.000Z').getTime(),
    );
  });

  it('create seguido de findByCnpj devolve a mesma entidade', async () => {
    const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_B) });

    await repository.create(empresa);

    const encontrada = await repository.findByCnpj(CNPJ_B);

    expect(encontrada).not.toBeNull();
    expect(encontrada!.id.toString()).toBe(empresa.id.toString());
    expect(encontrada!.cnpj.valor).toBe(CNPJ_B);
  });

  it('findByCnpj devolve null quando o CNPJ não existe', async () => {
    const encontrada = await repository.findByCnpj(CNPJ_C);

    expect(encontrada).toBeNull();
  });

  it('persiste o vínculo 1-1 com o usuário', async () => {
    const user = UserFactory.create({
      email: 'vinculo@empresa.test',
      role: UserRole.EMPRESA,
    });

    await userRepository.create(user);

    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      usuarioId: user.id,
    });

    await repository.create(empresa);

    const encontrada = await repository.findById(empresa.id.toString());

    expect(encontrada!.usuarioId?.toString()).toBe(user.id.toString());
  });

  it('listarPorEstado filtra pelo status e ordena por data de cadastro (asc)', async () => {
    const maisAntiga = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      nomeFantasia: 'Mais antiga',
      createdAt: new Date('2026-01-01T09:00:00.000Z'),
    });
    const maisNova = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_B),
      nomeFantasia: 'Mais nova',
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
    });
    const aprovada = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_C),
      nomeFantasia: 'Já aprovada',
      status: EmpresaStatus.APROVADA,
      createdAt: new Date('2026-02-01T09:00:00.000Z'),
    });

    await repository.create(maisNova);
    await repository.create(maisAntiga);
    await repository.create(aprovada);

    const fila = await repository.listarPorEstado(
      EmpresaStatus.PENDENTE_APROVACAO,
      'asc',
    );

    expect(fila.map((empresa) => empresa.nomeFantasia)).toEqual([
      'Mais antiga',
      'Mais nova',
    ]);
  });

  it('listarPorEstado com ordem desc devolve as mais recentes primeiro', async () => {
    const maisAntiga = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      nomeFantasia: 'Mais antiga',
      createdAt: new Date('2026-01-01T09:00:00.000Z'),
    });
    const maisNova = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_B),
      nomeFantasia: 'Mais nova',
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
    });

    await repository.create(maisAntiga);
    await repository.create(maisNova);

    const fila = await repository.listarPorEstado(
      EmpresaStatus.PENDENTE_APROVACAO,
      'desc',
    );

    expect(fila.map((empresa) => empresa.nomeFantasia)).toEqual([
      'Mais nova',
      'Mais antiga',
    ]);
  });

  it('salvarTransicao persiste a transição de estado com autor e data da decisão', async () => {
    const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
    const adminId = new UniqueEntityId();

    await repository.create(empresa);

    const resultado = empresa.aprovar(adminId);
    expect(resultado.isRight()).toBe(true);

    const aplicada = await repository.salvarTransicao(
      empresa,
      EmpresaStatus.PENDENTE_APROVACAO,
    );

    expect(aplicada).toBe(true);
    const encontrada = await repository.findById(empresa.id.toString());

    expect(encontrada!.status).toBe(EmpresaStatus.APROVADA);
    expect(encontrada!.decididoPor?.toString()).toBe(adminId.toString());
    expect(encontrada!.decididoEm?.getTime()).toBe(
      empresa.decididoEm!.getTime(),
    );
  });

  it('save não sobrescreve estado nem decisão gravados por outra transição', async () => {
    const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
    await repository.create(empresa);
    const obsoleta = (await repository.findById(empresa.id.toString()))!;
    const adminId = new UniqueEntityId();
    const motivo = 'Documentação do CNPJ não confere com a razão social.';
    const decidida = (await repository.findById(empresa.id.toString()))!;
    decidida.rejeitar(adminId, motivo);
    await repository.salvarTransicao(
      decidida,
      EmpresaStatus.PENDENTE_APROVACAO,
    );

    await repository.save(obsoleta);

    const final = await repository.findById(empresa.id.toString());
    expect(final!.status).toBe(EmpresaStatus.REJEITADA);
    expect(final!.decididoPor?.toString()).toBe(adminId.toString());
    expect(final!.decididoEm?.getTime()).toBe(decidida.decididoEm!.getTime());
    expect(final!.motivoDecisao).toBe(motivo);
  });

  it('salvarTrocaDeEmail com leitura obsoleta preserva os dados cadastrais gravados por save', async () => {
    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      nomeFantasia: 'Nome Antigo',
    });
    await repository.create(empresa);
    const obsoleta = (await repository.findById(empresa.id.toString()))!;
    await repository.save(
      EmpresaFactory.create(
        { cnpj: cnpj(CNPJ_A), nomeFantasia: 'Nome Novo' },
        empresa.id,
      ),
    );
    obsoleta.solicitarTrocaDeEmail(
      'novo@empresa.test',
      'hash-do-token',
      new Date('2026-04-05T11:00:00.000Z'),
    );

    await repository.salvarTrocaDeEmail(obsoleta);

    const final = await repository.findById(empresa.id.toString());
    expect(final!.nomeFantasia).toBe('Nome Novo');
    expect(final!.emailPendente).toBe('novo@empresa.test');
    expect(final!.tokenTrocaEmailHash).toBe('hash-do-token');
    expect(final!.tokenTrocaEmailExpiraEm?.getTime()).toBe(
      new Date('2026-04-06T11:00:00.000Z').getTime(),
    );
  });

  it('save cadastral com leitura obsoleta não apaga o e-mail pendente gravado por salvarTrocaDeEmail', async () => {
    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      nomeFantasia: 'Nome Antigo',
    });
    await repository.create(empresa);
    const obsoleta = (await repository.findById(empresa.id.toString()))!;
    const comTroca = (await repository.findById(empresa.id.toString()))!;
    comTroca.solicitarTrocaDeEmail(
      'novo@empresa.test',
      'hash-do-token',
      new Date('2026-04-05T11:00:00.000Z'),
    );
    await repository.salvarTrocaDeEmail(comTroca);

    await repository.save(
      EmpresaFactory.create(
        { cnpj: obsoleta.cnpj, nomeFantasia: 'Nome Novo' },
        empresa.id,
      ),
    );

    const final = await repository.findById(empresa.id.toString());
    expect(final!.nomeFantasia).toBe('Nome Novo');
    expect(final!.emailPendente).toBe('novo@empresa.test');
    expect(final!.tokenTrocaEmailHash).toBe('hash-do-token');
  });

  it('create com CNPJ já cadastrado falha com EmpresaJaExisteError (409)', async () => {
    const primeira = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
    const segunda = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });

    await repository.create(primeira);

    await expect(repository.create(segunda)).rejects.toBeInstanceOf(
      EmpresaJaExisteError,
    );
    await expect(repository.create(segunda)).rejects.toMatchObject({
      status: 409,
      message: 'CNPJ ou e-mail já cadastrado',
    });
  });
  describe('slug', () => {
    async function aprovadaCom(digitos: string, slug: string) {
      const empresa = EmpresaFactory.create({
        cnpj: cnpj(digitos),
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir(slug),
      });
      await repository.create(empresa);
      return empresa;
    }

    it('salvarTransicao grava o slug da aprovação e a leitura o reconstrói', async () => {
      const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
      await repository.create(empresa);
      empresa.aprovar(new UniqueEntityId());
      empresa.atribuirSlug(Slug.reconstruir('cafe-serra-verde'));

      const aplicada = await repository.salvarTransicao(
        empresa,
        EmpresaStatus.PENDENTE_APROVACAO,
      );

      expect(aplicada).toBe(true);
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.slug).toBe('cafe-serra-verde');
      const lida = await repository.findById(empresa.id.toString());
      expect(lida!.slug?.valor).toBe('cafe-serra-verde');
    });

    it('empresa sem slug volta com slug nulo', async () => {
      const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
      await repository.create(empresa);

      const lida = await repository.findById(empresa.id.toString());

      expect(lida!.slug).toBeNull();
    });

    it('findBySlug acha a empresa dona do slug', async () => {
      const empresa = await aprovadaCom(CNPJ_A, 'cafe-serra-verde');
      await aprovadaCom(CNPJ_B, 'outra');

      const encontrada = await repository.findBySlug('cafe-serra-verde');

      expect(encontrada!.id.toString()).toBe(empresa.id.toString());
      expect(encontrada!.slug?.valor).toBe('cafe-serra-verde');
    });

    it('findBySlug devolve null para slug inexistente', async () => {
      await aprovadaCom(CNPJ_A, 'cafe-serra-verde');

      expect(await repository.findBySlug('cafe')).toBeNull();
    });

    it("listarSlugsComPrefixo('cafe') devolve todos os slugs que começam com cafe", async () => {
      await aprovadaCom(CNPJ_A, 'cafe');
      await aprovadaCom(CNPJ_B, 'cafe-2');
      await aprovadaCom(CNPJ_C, 'cafeteria');
      await aprovadaCom(CNPJ_D, 'outra');
      await repository.create(
        EmpresaFactory.create({ cnpj: cnpj('55667788000186') }),
      );

      const slugs = await repository.listarSlugsComPrefixo('cafe');

      expect([...slugs].sort()).toEqual(['cafe', 'cafe-2', 'cafeteria']);
    });

    it('slug de outra empresa → SlugEmUsoError e a transição não é gravada', async () => {
      await aprovadaCom(CNPJ_A, 'cafe-serra-verde');
      const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_B) });
      await repository.create(empresa);
      empresa.aprovar(new UniqueEntityId());
      empresa.atribuirSlug(Slug.reconstruir('cafe-serra-verde'));

      const gravacao = repository.salvarTransicao(
        empresa,
        EmpresaStatus.PENDENTE_APROVACAO,
      );

      await expect(gravacao).rejects.toBeInstanceOf(SlugEmUsoError);
      await expect(gravacao).rejects.toThrow('Slug já está em uso');
      const linha = await contexto.prisma.empresa.findUniqueOrThrow({
        where: { id: empresa.id.toString() },
      });
      expect(linha.status).toBe('PENDENTE_APROVACAO');
      expect(linha.slug).toBeNull();
      expect(linha.decididoPor).toBeNull();
    });

    it('salvar de novo a própria empresa com o slug dela não conflita', async () => {
      const empresa = await aprovadaCom(CNPJ_A, 'cafe-serra-verde');
      empresa.suspender(new UniqueEntityId());

      const aplicada = await repository.salvarTransicao(
        empresa,
        EmpresaStatus.APROVADA,
      );

      expect(aplicada).toBe(true);
      const lida = await repository.findById(empresa.id.toString());
      expect(lida!.status).toBe(EmpresaStatus.SUSPENSA);
      expect(lida!.slug?.valor).toBe('cafe-serra-verde');
    });

    it('save cadastral com leitura obsoleta não apaga o slug gravado na aprovação', async () => {
      const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
      await repository.create(empresa);
      const obsoleta = (await repository.findById(empresa.id.toString()))!;
      const aprovada = (await repository.findById(empresa.id.toString()))!;
      aprovada.aprovar(new UniqueEntityId());
      aprovada.atribuirSlug(Slug.reconstruir('cafe-serra-verde'));
      await repository.salvarTransicao(
        aprovada,
        EmpresaStatus.PENDENTE_APROVACAO,
      );

      await repository.save(obsoleta);

      const lida = await repository.findById(empresa.id.toString());
      expect(lida!.slug?.valor).toBe('cafe-serra-verde');
    });
  });
});
