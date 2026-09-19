import { Hasher } from '@domain/fivo/application/ports/cryptography/hasher';
import { Module } from '@nestjs/common';

import { Argon2Hasher } from './argon2-hasher';
import { GeradorTokenOpaco } from './gerador-token-opaco';

@Module({
  providers: [{ provide: Hasher, useClass: Argon2Hasher }, GeradorTokenOpaco],
  exports: [Hasher, GeradorTokenOpaco],
})
export class CryptographyModule {}
