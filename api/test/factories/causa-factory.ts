import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Causa, CausaProps } from '@domain/fivo/entities/causa';

export class CausaFactory {
  static create(props: Partial<CausaProps> = {}, id?: UniqueEntityId): Causa {
    const causa = Causa.create(
      {
        nome: props.nome ?? 'Causa Teste',
        descricao: props.descricao ?? 'Descricão da Causa Teste',
        ...props,
      },
      id,
    ).value as Causa;

    return causa;
  }
}
