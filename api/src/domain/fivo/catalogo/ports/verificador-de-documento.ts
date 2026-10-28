export abstract class VerificadorDeDocumento {
  abstract estaLegivel(arquivoId: string): Promise<boolean>;
}
