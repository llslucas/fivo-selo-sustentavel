import { Module } from '@nestjs/common';

import { VerificadorDeDocumento } from '@domain/fivo/catalogo/ports/verificador-de-documento';

import { StorageModule } from '../storage/storage.module';
import { ArquivoService } from './arquivo.service';
import { VerificadorDeDocumentoPrisma } from './verificador-de-documento-prisma';

@Module({
  imports: [StorageModule],
  providers: [
    ArquivoService,
    {
      provide: VerificadorDeDocumento,
      useClass: VerificadorDeDocumentoPrisma,
    },
  ],
  exports: [ArquivoService, VerificadorDeDocumento],
})
export class ArquivoModule {}
