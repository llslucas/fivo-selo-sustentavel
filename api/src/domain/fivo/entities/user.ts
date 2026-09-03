import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Empresa } from './empresa';

export enum UserRole {
  ADMIN = 'ADMIN',
  EMPRESA = 'EMPRESA',
  INSTITUICAO = 'INSTITUICAO',
}

export interface UserProps {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  empresa?: Empresa | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class User extends Entity<UserProps> {
  static create(
    props: Optional<UserProps, 'createdAt'>,
    id?: UniqueEntityId,
  ): User {
    const user = new User(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
    return user;
  }

  get nome(): string {
    return this._props.nome;
  }

  get email(): string {
    return this._props.email;
  }

  get senha(): string {
    return this._props.senha;
  }

  get role(): UserRole {
    return this._props.role;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this._props.updatedAt;
  }
}
