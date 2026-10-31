import { proximoSlugLivre, Slug } from './slug';

describe('Slug', () => {
  it('should lowercase, strip accents and join words with hyphens', () => {
    expect(Slug.de('Café Serra Verde', 'empresa').valor).toBe(
      'cafe-serra-verde',
    );
  });

  it('should collapse runs of invalid characters and trim hyphens from the ends', () => {
    expect(Slug.de('  Água & Sabão!! ', 'empresa').valor).toBe('agua-sabao');
  });

  it('should strip cedilla and collapse repeated hyphens', () => {
    expect(Slug.de('ÇÃO--já', 'campanha').valor).toBe('cao-ja');
  });

  it('should keep a slug that normalizes to exactly 60 characters', () => {
    const texto = 'a'.repeat(60);

    expect(Slug.de(texto, 'empresa').valor).toBe(texto);
  });

  it('should truncate a slug that normalizes to 61 characters at 60', () => {
    const slug = Slug.de('a'.repeat(61), 'empresa');

    expect(slug.valor).toBe('a'.repeat(60));
  });

  it('should drop the trailing hyphen left by truncation', () => {
    const slug = Slug.de(`${'a'.repeat(59)} bcd`, 'empresa');

    expect(slug.valor).toBe('a'.repeat(59));
  });

  it('should fall back to "empresa" when the text has no valid character', () => {
    expect(Slug.de('!!!', 'empresa').valor).toBe('empresa');
  });

  it('should fall back to "campanha" when the text has no valid character', () => {
    expect(Slug.de('!!!', 'campanha').valor).toBe('campanha');
  });

  it('should rebuild a slug from a stored value', () => {
    expect(Slug.reconstruir('cafe-serra-verde').valor).toBe('cafe-serra-verde');
  });
});

describe('proximoSlugLivre', () => {
  const base = Slug.reconstruir('cafe-serra-verde');

  it('should return the base when it is free', () => {
    expect(proximoSlugLivre(base, ['outra-empresa']).valor).toBe(
      'cafe-serra-verde',
    );
  });

  it('should append -2 when the base is taken', () => {
    expect(proximoSlugLivre(base, ['cafe-serra-verde']).valor).toBe(
      'cafe-serra-verde-2',
    );
  });

  it('should append -3 when the base and -2 are taken', () => {
    expect(
      proximoSlugLivre(base, ['cafe-serra-verde', 'cafe-serra-verde-2']).valor,
    ).toBe('cafe-serra-verde-3');
  });

  it('should return the base when only -2 is taken', () => {
    expect(proximoSlugLivre(base, ['cafe-serra-verde-2']).valor).toBe(
      'cafe-serra-verde',
    );
  });
});
