import { Either, right, left } from '@core/either';
import { CredenciaisInvalidasError } from '../errors/wrong-credentials.error';
import { UserRepository } from '../ports/database/user-repository';
import { Hasher } from '../ports/cryptography/hasher';
import { Encrypter } from '../ports/cryptography/encrypter';

export interface AuthenticateUserUseCaseRequest {
  email: string;
  password: string;
}

export type AuthenticateUserUseCaseResponse = Either<
  CredenciaisInvalidasError,
  {
    accessToken: string;
  }
>;

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hasher: Hasher,
    private readonly encrypter: Encrypter,
  ) {}

  async execute({
    email,
    password,
  }: AuthenticateUserUseCaseRequest): Promise<AuthenticateUserUseCaseResponse> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return left(new CredenciaisInvalidasError());
    }

    const isPasswordValid = await this.hasher.compare(
      password,
      user.senha.valor,
    );

    if (!isPasswordValid) {
      return left(new CredenciaisInvalidasError());
    }

    const accessToken = await this.encrypter.encrypt({
      sub: user.id,
      role: user.role,
    });

    return right({ accessToken });
  }
}
