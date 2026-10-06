import { VerificadorDeDocumento } from '@domain/fivo/application/ports/verificador-de-documento';

export class FakeVerificadorDeDocumentos implements VerificadorDeDocumento {
  public shouldFail = false;
  public failOnIds: string[] = [];

  forceFailure(): void {
    this.shouldFail = true;
  }

  resetFailure(): void {
    this.shouldFail = false;
    this.failOnIds = [];
  }

  estaLegivel(arquivoId: string): Promise<boolean> {
    if (this.shouldFail && this.failOnIds.includes(arquivoId)) {
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }
}
