import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { DescricaoDocumentoInvalidaError } from '../application/errors/descricao-documento-invalida.error';
import { DocumentoObrigatorioError } from '../application/errors/documento-obrigatorio.error';
import { DocumentoValidacao } from './documento-validacao';

describe('DocumentoValidacao', () => {
  it('should create with arquivoId and descricao', () => {
    const result = DocumentoValidacao.criar('arquivo-1', 'Estatuto social');

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.arquivoId).toBeInstanceOf(UniqueEntityId);
      expect(result.value.arquivoId.toString()).toBe('arquivo-1');
      expect(result.value.descricao).toBe('Estatuto social');
    }
  });

  it('should create without descricao and expose it as null', () => {
    const result = DocumentoValidacao.criar('arquivo-1');

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.descricao).toBeNull();
    }
  });

  it('should accept a null descricao', () => {
    const result = DocumentoValidacao.criar('arquivo-1', null);

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.descricao).toBeNull();
    }
  });

  it.each([undefined, null, '', '   '])(
    'should reject arquivoId %p with DocumentoObrigatorioError',
    (arquivoId) => {
      const result = DocumentoValidacao.criar(arquivoId);

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(DocumentoObrigatorioError);
    },
  );

  it('should return the status and message defined for the missing document', () => {
    const result = DocumentoValidacao.criar('');

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value.status).toBe(422);
      expect(result.value.message).toBe(
        'Anexe um documento que comprove a existência da instituição.',
      );
    }
  });

  it('should accept descricao with exactly 200 characters', () => {
    const result = DocumentoValidacao.criar('arquivo-1', 'a'.repeat(200));

    expect(result.isRight()).toBe(true);
  });

  it('should reject descricao with 201 characters', () => {
    const result = DocumentoValidacao.criar('arquivo-1', 'a'.repeat(201));

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(DescricaoDocumentoInvalidaError);
  });
});
