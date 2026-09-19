import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaTransactionContext {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  atual(): Prisma.TransactionClient | undefined {
    return this.storage.getStore();
  }

  executar<T>(
    cliente: Prisma.TransactionClient,
    job: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run(cliente, job);
  }
}
