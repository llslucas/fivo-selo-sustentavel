import { NomeCausaInvalidoError } from '../application/errors/nome-causa-invalido.error';
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

    expect(causaOrError.isLeft()).toBe(true);
    expect(causaOrError.value).toBeInstanceOf(NomeCausaInvalidoError);
  });

  it('Causa.criar() deve recusar nome só com espaços', () => {
    const causaOrError = Causa.create({
      nome: '   ',
      descricao: 'Descrição Teste',
    });

    expect(causaOrError.isLeft()).toBe(true);
    expect(causaOrError.value).toBeInstanceOf(NomeCausaInvalidoError);
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

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  function criarCausa(status = CausaStatus.ATIVA): Causa {
    return Causa.create({
      nome: 'Causa Teste',
      descricao: 'Descrição Teste',
      status,
    }).value as Causa;
  }

  it('Causa.editar() deve trocar nome e descrição de uma causa ativa', () => {
    const causa = criarCausa();

    const result = causa.editar('Novo Nome', 'Nova descrição');

    expect(result.isRight()).toBe(true);
    expect(causa.nome).toBe('Novo Nome');
    expect(causa.descricao).toBe('Nova descrição');
  });

  it.each([
    ['vazio', ''],
    ['só com espaços', '   '],
    ['com 81 caracteres', 'a'.repeat(81)],
  ])('Causa.editar() deve recusar nome %s e manter os dados', (_caso, nome) => {
    const causa = criarCausa();

    const result = causa.editar(nome, 'Nova descrição');

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(NomeCausaInvalidoError);
    expect(causa.nome).toBe('Causa Teste');
    expect(causa.descricao).toBe('Descrição Teste');
  });

  it('Causa.editar() deve recusar causa inativa e manter os dados', () => {
    const causa = criarCausa(CausaStatus.INATIVA);

    const result = causa.editar('Novo Nome', 'Nova descrição');

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(causa.nome).toBe('Causa Teste');
  });
});
