import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Empresa } from './empresa';
import { Senha } from './senha';

export enum UserRole {
  ADMIN = 'ADMIN',
  EMPRESA = 'EMPRESA',
  INSTITUICAO = 'INSTITUICAO',
}

export interface UserProps {
  nome: string;
  email: string;
  senha: Senha;
  role: UserRole;
  empresa?: Empresa | null;
  falhasLogin: number;
  primeiraFalhaEm: Date | null;
  bloqueadoAte: Date | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export class User extends Entity<UserProps> {
  static create(
    props: Optional<
      UserProps,
      'createdAt' | 'falhasLogin' | 'primeiraFalhaEm' | 'bloqueadoAte'
    >,
    id?: UniqueEntityId,
  ): User {
    const user = new User(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        falhasLogin: props.falhasLogin ?? 0,
        primeiraFalhaEm: props.primeiraFalhaEm ?? null,
        bloqueadoAte: props.bloqueadoAte ?? null,
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

  get senha(): Senha {
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

  get falhasLogin(): number {
    return this._props.falhasLogin;
  }

  get primeiraFalhaEm(): Date | null {
    return this._props.primeiraFalhaEm;
  }

  get bloqueadoAte(): Date | null {
    return this._props.bloqueadoAte;
  }

  registrarFalhaDeLogin(agora: Date): void {
    const MINUTE_IN_MILLISECONDS = 60000;

    const diffInMinutes = Math.abs(
      this._props.primeiraFalhaEm
        ? (agora.getTime() - this._props.primeiraFalhaEm.getTime()) /
            MINUTE_IN_MILLISECONDS
        : 0,
    );

    if (this._props.primeiraFalhaEm && diffInMinutes > 15) {
      this._props.falhasLogin = 1;
      this._props.primeiraFalhaEm = agora;
    } else {
      this._props.falhasLogin += 1;
      if (!this._props.primeiraFalhaEm) {
        this._props.primeiraFalhaEm = agora;
      }
    }

    if (this._props.falhasLogin >= 5) {
      this._props.bloqueadoAte = new Date(
        agora.getTime() + 15 * MINUTE_IN_MILLISECONDS,
      );
    }
  }

  estaBloqueado(agora: Date): boolean {
    if (!this._props.bloqueadoAte) {
      return false;
    }

    return agora.getTime() < this._props.bloqueadoAte.getTime();
  }

  alterarEmail(email: string): void {
    this._props.email = email;
    this._props.updatedAt = new Date();
  }

  registrarLoginOk(): void {
    this._props.bloqueadoAte = null;
    this._props.primeiraFalhaEm = null;
    this._props.falhasLogin = 0;
  }
}
