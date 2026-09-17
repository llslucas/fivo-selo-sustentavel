import {
  RegistroAuditoria,
  RegistroAuditoriaRepository,
} from '@domain/fivo/application/ports/registro-auditoria-repository';

export class InMemoryRegistroAuditoriaRepository implements RegistroAuditoriaRepository {
  public items: RegistroAuditoria[] = [];

  registrar(registro: RegistroAuditoria): Promise<void> {
    this.items.push(registro);
    return Promise.resolve();
  }
}
