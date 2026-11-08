import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { Beneficiada } from './beneficiada';

describe('Beneficiada Value Object', () => {
  it('should create an INSTITUICAO beneficiada when only instituicaoId is given', () => {
    const beneficiada = Beneficiada.criar({ instituicaoId: 'instituicao-1' });

    if (beneficiada.isLeft()) {
      throw new Error('Expected a valid value, but got an error');
    }

    expect(beneficiada.value.tipo).toBe('INSTITUICAO');
    expect(beneficiada.value.id).toBe('instituicao-1');
  });

  it('should create a CAUSA beneficiada when only causaId is given', () => {
    const beneficiada = Beneficiada.criar({ causaId: 'causa-1' });

    if (beneficiada.isLeft()) {
      throw new Error('Expected a valid value, but got an error');
    }

    expect(beneficiada.value.tipo).toBe('CAUSA');
    expect(beneficiada.value.id).toBe('causa-1');
  });

  it('should return an error when both ids are given', () => {
    const beneficiada = Beneficiada.criar({
      instituicaoId: 'instituicao-1',
      causaId: 'causa-1',
    });

    expect(beneficiada.isLeft()).toBe(true);
    expect(beneficiada.value).toBeInstanceOf(BeneficiadaAmbiguaError);
  });

  it('should return an error when neither id is given', () => {
    const beneficiada = Beneficiada.criar({});

    expect(beneficiada.isLeft()).toBe(true);
    expect(beneficiada.value).toBeInstanceOf(BeneficiadaAmbiguaError);
  });

  it('Errors should contain the correct status code and message', () => {
    const beneficiada = Beneficiada.criar({});

    expect(beneficiada.isLeft()).toBe(true);
    if (beneficiada.isLeft()) {
      expect(beneficiada.value.status).toBe(422);
      expect(beneficiada.value.message).toBe(
        'Informe exatamente uma beneficiada: instituição ou causa',
      );
    }
  });
});
