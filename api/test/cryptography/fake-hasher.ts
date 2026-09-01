import { Hasher } from '@domain/fivo/application/ports/cryptography/hasher';

export class FakeHasher implements Hasher {
  async hash(plain: string) {
    return Promise.resolve(plain.concat('-hashed'));
  }

  async compare(plain: string, hash: string) {
    return Promise.resolve(plain.concat('-hashed') === hash);
  }
}
