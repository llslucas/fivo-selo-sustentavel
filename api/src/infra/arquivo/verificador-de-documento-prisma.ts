import { Injectable } from '@nestjs/common';

import { VerificadorDeDocumento } from '@domain/fivo/catalogo/ports/verificador-de-documento';

import { ArquivoService } from './arquivo.service';

@Injectable()
export class VerificadorDeDocumentoPrisma implements VerificadorDeDocumento {
  constructor(private readonly arquivoService: ArquivoService) {}

  async estaLegivel(arquivoId: string): Promise<boolean> {
    try {
      // Legível = o registro existe e os bytes saem do storage.
      return (await this.arquivoService.lerBytes(arquivoId)) !== null;
    } catch {
      // Storage fora do ar ou objeto sumido: a aprovação responde 503
      // até o arquivo voltar a ser lido (spec, Edge cases).
      return false;
    }
  }
}
