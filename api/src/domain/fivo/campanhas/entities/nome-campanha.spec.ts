import { NomeCampanhaInvalidoError } from '../errors/nome-campanha-invalido.error';
import { NomeCampanha } from './nome-campanha';

describe('NomeCampanha Value Object', () => {
  it('should trim surrounding spaces', () => {
    const nome = NomeCampanha.criar(' Feira Limpa ');

    if (nome.isLeft()) {
      throw new Error('Expected a valid value, but got an error');
    }

    expect(nome.value.valor).toBe('Feira Limpa');
  });

  it.each([3, 80])('should accept a name with %i characters', (tamanho) => {
    const nome = NomeCampanha.criar('a'.repeat(tamanho));

    if (nome.isLeft()) {
      throw new Error('Expected a valid value, but got an error');
    }

    expect(nome.isRight()).toBe(true);
    expect(nome.value.valor).toHaveLength(tamanho);
  });

  it.each([2, 81])('should reject a name with %i characters', (tamanho) => {
    const nome = NomeCampanha.criar('a'.repeat(tamanho));

    expect(nome.isLeft()).toBe(true);
    expect(nome.value).toBeInstanceOf(NomeCampanhaInvalidoError);
  });

  it.each([' ab ', '   ', ''])('should reject "%s" after trimming', (texto) => {
    const nome = NomeCampanha.criar(texto);

    expect(nome.isLeft()).toBe(true);
    expect(nome.value).toBeInstanceOf(NomeCampanhaInvalidoError);
  });

  it('Errors should contain the correct status code and message', () => {
    const nome = NomeCampanha.criar('ab');

    expect(nome.isLeft()).toBe(true);
    if (nome.isLeft()) {
      expect(nome.value.status).toBe(422);
      expect(nome.value.message).toBe(
        'O nome deve ter entre 3 e 80 caracteres',
      );
    }
  });

  it('should consider two names with the same trimmed text equal', () => {
    const a = NomeCampanha.criar('Feira Limpa');
    const b = NomeCampanha.criar('  Feira Limpa  ');

    if (a.isLeft() || b.isLeft()) {
      throw new Error('Expected valid values, but got an error');
    }

    expect(a.value.equals(b.value)).toBe(true);
  });
});
