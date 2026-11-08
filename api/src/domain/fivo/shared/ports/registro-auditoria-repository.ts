export interface RegistroAuditoria {
  id: string;
  tipo: string;
  descricao: string;
  usuarioId?: string | null;
  entidadeId?: string | null;
  dados?: Record<string, unknown> | null;
  criadoEm: Date;
}

export abstract class RegistroAuditoriaRepository {
  abstract registrar(registro: RegistroAuditoria): Promise<void>;
}
