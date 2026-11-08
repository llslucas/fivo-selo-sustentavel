import { Prisma } from '@prisma/client';

/** `P2002` — violação de constraint de unicidade. */
export function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === 'P2002'
  );
}

/**
 * `P2002` cujo alvo inclui a coluna `coluna`. O Prisma informa o alvo em
 * `meta.target` ora como lista de campos (`['empresaId', 'slug']`), ora como
 * nome da constraint (`'campanha_empresa_id_slug_key'`): os dois casos contam.
 */
export function ehViolacaoDeUnicidadeEm(
  erro: unknown,
  coluna: string,
): boolean {
  if (!ehViolacaoDeUnicidade(erro)) {
    return false;
  }

  const alvo = (erro as Prisma.PrismaClientKnownRequestError).meta?.target;

  if (Array.isArray(alvo)) {
    return alvo.includes(coluna);
  }

  if (typeof alvo === 'string') {
    return alvo.split('_').includes(coluna);
  }

  return false;
}
