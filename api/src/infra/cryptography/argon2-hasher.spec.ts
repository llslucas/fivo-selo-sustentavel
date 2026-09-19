import { Argon2Hasher } from './argon2-hasher';

describe('Argon2Hasher', () => {
  const sut = new Argon2Hasher();

  it('produces a hash different from the plain text', async () => {
    const hash = await sut.hash('senha-super-secreta');

    expect(hash).not.toBe('senha-super-secreta');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('compare returns true for the matching plain text', async () => {
    const hash = await sut.hash('senha-super-secreta');

    await expect(sut.compare('senha-super-secreta', hash)).resolves.toBe(true);
  });

  it('compare returns false for a non-matching plain text', async () => {
    const hash = await sut.hash('senha-super-secreta');

    await expect(sut.compare('senha-errada', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same plain text (random salt)', async () => {
    const hash1 = await sut.hash('senha-super-secreta');
    const hash2 = await sut.hash('senha-super-secreta');

    expect(hash1).not.toBe(hash2);
  });
});
