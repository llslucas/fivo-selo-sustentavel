import { Either, left, right } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { ValueObject } from '@core/types/entities/value-object';
import { DescricaoDocumentoInvalidaError } from '../application/errors/descricao-documento-invalida.error';
import { DocumentoObrigatorioError } from '../application/errors/documento-obrigatorio.error';

const LIMITE_DESCRICAO = 200;

interface DocumentoValidacaoProps {
  arquivoId: UniqueEntityId;
  descricao: string | null;
}

export class DocumentoValidacao extends ValueObject<DocumentoValidacaoProps> {
  static criar(
    arquivoId?: string | null,
    descricao?: string | null,
  ): Either<
    DocumentoObrigatorioError | DescricaoDocumentoInvalidaError,
    DocumentoValidacao
  > {
    if (!arquivoId || arquivoId.trim().length === 0) {
      return left(new DocumentoObrigatorioError());
    }

    if (descricao && descricao.length > LIMITE_DESCRICAO) {
      return left(new DescricaoDocumentoInvalidaError());
    }

    return right(
      new DocumentoValidacao({
        arquivoId: new UniqueEntityId(arquivoId),
        descricao: descricao ?? null,
      }),
    );
  }

  get arquivoId(): UniqueEntityId {
    return this.props.arquivoId;
  }

  get descricao(): string | null {
    return this.props.descricao;
  }
}
