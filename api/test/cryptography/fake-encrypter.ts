import { Encrypter } from '@domain/fivo/application/ports/cryptography/encrypter';

export class FakeEncrypter implements Encrypter {
  async encrypt(payload: Record<string, unknown>) {
    return Promise.resolve(JSON.stringify(payload));
  }
}
