import { CampanhaStatus, EmpresaStatus, PrismaClient } from '@prisma/client';

import { Slug, proximoSlugLivre } from '@domain/fivo/shared/entities/slug';

export interface ResultadoBackfill {
  empresas: number;
  campanhas: number;
}

// Mesma ordem para a mesma base: quem foi decidido antes fica com o slug sem
// sufixo. `criadoEm` e `id` desempatam para a ordem não depender do banco.
const POR_DECISAO = [
  { decididoEm: { sort: 'asc', nulls: 'last' } },
  { criadoEm: 'asc' },
  { id: 'asc' },
] as const;

/**
 * Dá slug às empresas `APROVADA`/`SUSPENSA` e às campanhas `APROVADA` que
 * ainda não têm, com as regras de `Slug` e `proximoSlugLivre` (VIT-01).
 * Idempotente: quem já tem slug não é tocado, então rodar de novo não muda
 * nada. Um registro por vez, para cada um ver os slugs dos anteriores.
 */
export async function backfillSlugs(
  prisma: PrismaClient,
): Promise<ResultadoBackfill> {
  const empresas = await prisma.empresa.findMany({
    where: {
      slug: null,
      status: { in: [EmpresaStatus.APROVADA, EmpresaStatus.SUSPENSA] },
    },
    orderBy: [...POR_DECISAO],
    select: { id: true, nomeFantasia: true },
  });

  for (const empresa of empresas) {
    const base = Slug.de(empresa.nomeFantasia, 'empresa');
    const ocupados = await prisma.empresa.findMany({
      where: { slug: { startsWith: base.valor } },
      select: { slug: true },
    });
    const slug = proximoSlugLivre(base, slugsDe(ocupados));

    await prisma.empresa.updateMany({
      where: { id: empresa.id, slug: null },
      data: { slug: slug.valor },
    });
  }

  const campanhas = await prisma.campanha.findMany({
    where: { slug: null, status: CampanhaStatus.APROVADA },
    orderBy: [...POR_DECISAO],
    select: { id: true, empresaId: true, nome: true },
  });

  for (const campanha of campanhas) {
    const base = Slug.de(campanha.nome, 'campanha');
    const daEmpresa = await prisma.campanha.findMany({
      where: { empresaId: campanha.empresaId },
      select: { slug: true },
    });
    const slug = proximoSlugLivre(base, slugsDe(daEmpresa));

    await prisma.campanha.updateMany({
      where: { id: campanha.id, slug: null },
      data: { slug: slug.valor },
    });
  }

  return { empresas: empresas.length, campanhas: campanhas.length };
}

function slugsDe(linhas: { slug: string | null }[]): string[] {
  return linhas
    .map((linha) => linha.slug)
    .filter((slug): slug is string => slug !== null);
}

if (require.main === module) {
  const prisma = new PrismaClient();

  backfillSlugs(prisma)
    .then(({ empresas, campanhas }) => {
      console.log(
        `Backfill de slugs: ${empresas} empresa(s) e ${campanhas} campanha(s).`,
      );
    })
    .catch((erro: unknown) => {
      console.error(erro);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
