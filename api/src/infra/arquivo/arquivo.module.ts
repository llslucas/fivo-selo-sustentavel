import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { ArquivoService } from './arquivo.service';

@Module({
  imports: [StorageModule],
  providers: [ArquivoService],
  exports: [ArquivoService],
})
export class ArquivoModule {}
