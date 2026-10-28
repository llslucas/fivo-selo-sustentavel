export abstract class UnitOfWork {
  abstract executar<T>(job: () => Promise<T>): Promise<T>;
}
