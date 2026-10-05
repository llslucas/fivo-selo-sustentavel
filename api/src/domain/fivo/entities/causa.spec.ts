import { NomeCausaInvalidoError } from '../application/errors/beneficiada-ambigua.error';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { Causa, CausaStatus } from './causa';

describe('Casa Entity', () => {
  it('Causa.criar() deve retornar uma causa já ativa', () => {
    const causaOrError = Causa.create({
      nome: 'Causa Teste',
      descricao: 'Descrição Teste',
    });

    if (causaOrError.isLeft()) {
      throw new Error();
    }

    const causa = causaOrError.value;

    expect(causa.status).toBe(CausaStatus.ATIVA);
  });

  it('Causa.criar() deve criar uma causa com o nome com exatos 80 caracteres', () => {
    const nomeExemplo =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris ut cursus augue.';

    const causaOrError = Causa.create({
      nome: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris ut cursus augue.',
      descricao: 'Descrição Teste',
    });

    if (causaOrError.isLeft()) {
      throw new Error();
    }

    const causa = causaOrError.value;

    expect(nomeExemplo.length).toEqual(80);
    expect(causa.status).toBe(CausaStatus.ATIVA);
  });

  it('Causa.criar() deve recusar nomes maiores que 80 caracteres', () => {
    const causaOrError = Causa.create({
      nome: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris ut cursus augue..',
      descricao: 'Descrição Teste',
    });

    if (causaOrError.isLeft()) {
      expect(causaOrError.value).toBeInstanceOf(NomeCausaInvalidoError);
    }
  });

  it('Causa.inativar() deve inativar uma causa já ativa', () => {
    const causaOrError = Causa.create({
      nome: 'Causa Teste',
      descricao: 'Descrição Teste',
    });

    if (causaOrError.isLeft()) {
      throw new Error();
    }

    const causa = causaOrError.value;

    causa.inativar();

    expect(causa.status).toBe(CausaStatus.INATIVA);
  });

  it('Causa.inativar() deve retornar um erro caso já esteja inativa', () => {
    const causaOrError = Causa.create({
      nome: 'Causa Teste',
      descricao: 'Descrição Teste',
      status: CausaStatus.INATIVA,
    });

    if (causaOrError.isLeft()) {
      throw new Error();
    }

    const causa = causaOrError.value;

    const result = causa.inativar();

    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    }
  });
});
