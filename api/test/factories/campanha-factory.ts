import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Campanha, CampanhaProps } from '@domain/fivo/entities/campanha';
import { NomeCampanha } from '@domain/fivo/entities/nome-campanha';

export class CampanhaFactory {
  static create(
    props: Partial<CampanhaProps> = {},
    id?: UniqueEntityId,
  ): Campanha {
    const nome = NomeCampanha.criar('Campanha Teste');

    if (nome.isLeft()) {
      throw nome.value;
    }

    const campanha = Campanha.create(
      {
        empresaId: new UniqueEntityId(),
        nome: nome.value,
        ...props,
      },
      id,
    );

    return campanha;
  }
}
