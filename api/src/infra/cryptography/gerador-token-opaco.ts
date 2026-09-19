import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

const TOKEN_BYTES = 32; // 256 bits

@Injectable()
export class GeradorTokenOpaco {
  gerar(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }

  sha256(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
