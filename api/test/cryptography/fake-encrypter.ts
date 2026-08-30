import { Encrypter } from '@domain/empresa/application/ports/encrypter';

export class FakeEncrypter implements Encrypter {
  async encrypt(payload: Record<string, unknown>) {
    return Promise.resolve(JSON.stringify(payload));
  }
}
