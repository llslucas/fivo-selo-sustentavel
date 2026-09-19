import { Injectable } from '@nestjs/common';

import { UnitOfWork } from '@domain/fivo/application/ports/unit-of-work';

import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: PrismaTransactionContext,
  ) {}

  executar<T>(job: () => Promise<T>): Promise<T> {
    if (this.contexto.atual()) {
      return job();
    }

    return this.prisma.$transaction((cliente) =>
      this.contexto.executar(cliente, job),
    );
  }
}
