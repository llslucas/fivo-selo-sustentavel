import { UnitOfWork } from '@domain/fivo/application/ports/unit-of-work';

export class InMemoryUnitOfWork implements UnitOfWork {
  executar<T>(job: () => Promise<T>): Promise<T> {
    return job();
  }
}
