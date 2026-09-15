import { ValueObject } from '@core/types/entities/value-object';
import { Either, left, right } from '@core/either';
import { SenhaFracaError } from '../application/errors/senha-fraca.error';
import { Hasher } from '../application/ports/cryptography/hasher';

export interface SenhaProps {
  senha: string;
}

export class Senha extends ValueObject<SenhaProps> {
  private static readonly MIN_LENGTH = 10;

  private constructor(props: SenhaProps) {
    super(props);
  }

  public static create(senha: string): Either<SenhaFracaError, Senha> {
    if (!senha || senha.length < this.MIN_LENGTH) {
      return left(new SenhaFracaError());
    }

    return right(new Senha({ senha }));
  }

  get valor(): string {
    return this._props.senha;
  }

  async hash(hasher: Hasher): Promise<Senha> {
    const hashedValue = await hasher.hash(this._props.senha);
    return new Senha({ senha: hashedValue });
  }
}
