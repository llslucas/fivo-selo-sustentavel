export class MotivoInsuficienteError extends Error {
  status = 422;

  constructor() {
    super('Motivo insuficiente para rejeição.');
  }
}
