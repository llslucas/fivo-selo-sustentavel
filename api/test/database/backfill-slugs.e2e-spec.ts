import { Either } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { CampanhaRepository } from '@domain/fivo/campanhas/ports/campanha-repository';
import { CampanhaStatus } from '@domain/fivo/campanhas/entities/campanha';
import { NomeCampanha } from '@domain/fivo/campanhas/entities/nome-campanha';
import { Beneficiada } from '@domain/fivo/catalogo/entities/beneficiada';
import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { EmpresaStatus } from '@domain/fivo/empresas/entities/empresa';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { Slug } from '@domain/fivo/shared/entities/slug';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

import { backfillSlugs } from '../../prisma/scripts/backfill-slugs';

function valor<T>(resultado: Either<Error, T>): T {
  if (resultado.isLeft()) {
    throw resultado.value;
  }

  return resultado.value;
}

describe('backfill de slugs (e2e)', () => {
  let contexto: AppDeTeste;
  let empresas: EmpresaRepository;
  let campanhas: CampanhaRepository;
  let causaId: string;
  let sequenciaCnpj: number;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    empresas = contexto.app.get(EmpresaRepository);
    campanhas = contexto.app.get(CampanhaRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    sequenciaCnpj = 1;

    const causa = CausaFactory.create({ nome: 'Educação' });
    await contexto.app.get(CausaRepository).create(causa);
    causaId = causa.id.toString();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  async function empresa(
    nomeFantasia: string,
    status: EmpresaStatus,
    decididoEm: Date | null,
    slug: string | null = null,
  ): Promise<string> {
    const nova = EmpresaFactory.create({
      cnpj: cnpjValido(sequenciaCnpj++),
      nomeFantasia,
      status,
      decididoEm,
      decididoPor: decididoEm ? new UniqueEntityId() : null,
      slug: slug ? Slug.reconstruir(slug) : null,
    });
    await empresas.create(nova);
    return nova.id.toString();
  }

  async function campanha(
    empresaId: string,
    nome: string,
    status: CampanhaStatus,
    decididoEm: Date | null,
  ): Promise<string> {
    const nova = CampanhaFactory.completa({
      empresaId: new UniqueEntityId(empresaId),
      nome: valor(NomeCampanha.criar(nome)),
      beneficiada: valor(Beneficiada.criar({ causaId })),
      status,
      decididoEm,
      decididoPor: decididoEm ? new UniqueEntityId() : null,
    });
    await campanhas.create(nova);
    return nova.id.toString();
  }

  async function slugDaEmpresa(id: string): Promise<string | null> {
    const linha = await contexto.prisma.empresa.findUniqueOrThrow({
      where: { id },
    });
    return linha.slug;
  }

  async function slugDaCampanha(id: string): Promise<string | null> {
    const linha = await contexto.prisma.campanha.findUniqueOrThrow({
      where: { id },
    });
    return linha.slug;
  }

  it('duas empresas homônimas aprovadas recebem a base e -2 pela ordem de decididoEm', async () => {
    // Gravada primeiro, mas decidida depois: a ordem de inserção não manda.
    const depois = await empresa(
      'Café Serra Verde',
      EmpresaStatus.APROVADA,
      new Date('2026-05-02T10:00:00Z'),
    );
    const antes = await empresa(
      'Café Serra Verde',
      EmpresaStatus.APROVADA,
      new Date('2026-05-01T10:00:00Z'),
    );

    await backfillSlugs(contexto.prisma);

    expect(await slugDaEmpresa(antes)).toBe('cafe-serra-verde');
    expect(await slugDaEmpresa(depois)).toBe('cafe-serra-verde-2');
  });

  it('empresa SUSPENSA também recebe slug, respeitando o já ocupado', async () => {
    const comSlug = await empresa(
      'Café Serra Verde',
      EmpresaStatus.APROVADA,
      new Date('2026-06-01T10:00:00Z'),
      'cafe-serra-verde',
    );
    const suspensa = await empresa(
      'Café Serra Verde',
      EmpresaStatus.SUSPENSA,
      new Date('2026-05-01T10:00:00Z'),
    );

    await backfillSlugs(contexto.prisma);

    expect(await slugDaEmpresa(comSlug)).toBe('cafe-serra-verde');
    expect(await slugDaEmpresa(suspensa)).toBe('cafe-serra-verde-2');
  });

  it('campanhas APROVADA homônimas da mesma empresa recebem a base e -2 pela ordem de decididoEm', async () => {
    const dona = await empresa(
      'Café Serra Verde',
      EmpresaStatus.APROVADA,
      new Date('2026-05-01T10:00:00Z'),
    );
    const outra = await empresa(
      'Outra Empresa',
      EmpresaStatus.APROVADA,
      new Date('2026-05-01T10:00:00Z'),
    );
    const depois = await campanha(
      dona,
      'Água Limpa',
      CampanhaStatus.APROVADA,
      new Date('2026-07-02T10:00:00Z'),
    );
    const antes = await campanha(
      dona,
      'Água Limpa',
      CampanhaStatus.APROVADA,
      new Date('2026-07-01T10:00:00Z'),
    );
    const deOutra = await campanha(
      outra,
      'Água Limpa',
      CampanhaStatus.APROVADA,
      new Date('2026-07-03T10:00:00Z'),
    );

    await backfillSlugs(contexto.prisma);

    expect(await slugDaCampanha(antes)).toBe('agua-limpa');
    expect(await slugDaCampanha(depois)).toBe('agua-limpa-2');
    expect(await slugDaCampanha(deOutra)).toBe('agua-limpa');
  });

  it('empresa PENDENTE_APROVACAO e campanha RASCUNHO ficam sem slug', async () => {
    const pendente = await empresa(
      'Café Pendente',
      EmpresaStatus.PENDENTE_APROVACAO,
      null,
    );
    const aprovada = await empresa(
      'Café Aprovado',
      EmpresaStatus.APROVADA,
      new Date('2026-05-01T10:00:00Z'),
    );
    const rascunho = await campanha(
      aprovada,
      'Rascunho',
      CampanhaStatus.RASCUNHO,
      null,
    );

    await backfillSlugs(contexto.prisma);

    expect(await slugDaEmpresa(pendente)).toBeNull();
    expect(await slugDaCampanha(rascunho)).toBeNull();
    expect(await slugDaEmpresa(aprovada)).toBe('cafe-aprovado');
  });

  it('a segunda execução não muda nada', async () => {
    const dona = await empresa(
      'Café Serra Verde',
      EmpresaStatus.APROVADA,
      new Date('2026-05-01T10:00:00Z'),
    );
    await empresa(
      'Café Serra Verde',
      EmpresaStatus.SUSPENSA,
      new Date('2026-05-02T10:00:00Z'),
    );
    await empresa('Café Pendente', EmpresaStatus.PENDENTE_APROVACAO, null);
    await campanha(
      dona,
      'Água Limpa',
      CampanhaStatus.APROVADA,
      new Date('2026-07-01T10:00:00Z'),
    );
    await campanha(dona, 'Rascunho', CampanhaStatus.RASCUNHO, null);

    const primeira = await backfillSlugs(contexto.prisma);
    const empresasDepoisDaPrimeira = await contexto.prisma.empresa.findMany({
      orderBy: { id: 'asc' },
    });
    const campanhasDepoisDaPrimeira = await contexto.prisma.campanha.findMany({
      orderBy: { id: 'asc' },
    });

    const segunda = await backfillSlugs(contexto.prisma);

    expect(primeira).toEqual({ empresas: 2, campanhas: 1 });
    expect(segunda).toEqual({ empresas: 0, campanhas: 0 });
    expect(
      await contexto.prisma.empresa.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(empresasDepoisDaPrimeira);
    expect(
      await contexto.prisma.campanha.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(campanhasDepoisDaPrimeira);
  });
});
