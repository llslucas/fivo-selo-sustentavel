import { Either, right, left } from '@core/either';
import { WrongCredentialsError } from '../errors/wrong-credentials.error';
import { UserRepository } from '../ports/database/user-repository';
import { Hasher } from '../ports/cryptography/hasher';
import { Encrypter } from '../ports/cryptography/encrypter';

export interface AuthenticateUserUseCaseRequest {
  email: string;
  password: string;
}

export type AuthenticateUserUseCaseResponse = Either<
  WrongCredentialsError,
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
      return left(new WrongCredentialsError());
    }

    const isPasswordValid = await this.hasher.compare(password, user.senha);

    if (!isPasswordValid) {
      return left(new WrongCredentialsError());
    }

    const accessToken = await this.encrypter.encrypt({
      sub: user.id,
      role: user.role,
    });

    return right({ accessToken });
  }
}
