import { GeradorTokenOpaco } from './gerador-token-opaco';

describe('GeradorTokenOpaco', () => {
  const sut = new GeradorTokenOpaco();

  it('gerar() produces a base64url string with at least 256 bits of entropy', () => {
    const token = sut.gerar();

    // base64url encodes 6 bits per char; 256 bits / 6 = 42.67 -> at least 43 chars
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('gerar() produces a different token on each call', () => {
    const token1 = sut.gerar();
    const token2 = sut.gerar();

    expect(token1).not.toBe(token2);
  });

  it('sha256() is deterministic for the same input', () => {
    const token = sut.gerar();

    expect(sut.sha256(token)).toBe(sut.sha256(token));
  });

  it('sha256() produces a 64-char hex digest', () => {
    const digest = sut.sha256('valor-qualquer');

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('sha256() produces different digests for different inputs', () => {
    expect(sut.sha256('a')).not.toBe(sut.sha256('b'));
  });
});
