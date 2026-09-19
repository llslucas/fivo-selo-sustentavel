import { Storage } from '@domain/fivo/application/ports/storage';
import { Module } from '@nestjs/common';

import { LocalDiskStorage } from './local-disk-storage';

@Module({
  providers: [
    {
      provide: Storage,
      useFactory: () =>
        new LocalDiskStorage(process.env.STORAGE_DIR ?? './tmp/storage'),
    },
  ],
  exports: [Storage],
})
export class StorageModule {}
