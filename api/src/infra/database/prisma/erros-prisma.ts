import { Prisma } from '@prisma/client';

/** `P2002` — violação de constraint de unicidade. */
export function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === 'P2002'
  );
}
