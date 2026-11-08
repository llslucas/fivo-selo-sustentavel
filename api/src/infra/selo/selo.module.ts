import { RenderizadorDeSelo } from '@domain/fivo/campanhas/ports/renderizador-de-selo';
import { Module } from '@nestjs/common';

import { QrCodeRenderizadorDeSelo } from './qrcode-renderizador-de-selo';

@Module({
  providers: [
    { provide: RenderizadorDeSelo, useClass: QrCodeRenderizadorDeSelo },
  ],
  exports: [RenderizadorDeSelo],
})
export class SeloModule {}
