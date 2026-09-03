import { User, UserRole } from '@domain/fivo/entities/user';
import { UserRepository } from '../ports/database/user-repository';
import { Either, left, right } from '@core/either';
import { UserAlreadyExistsError } from '../errors/users-already-exists.error';
import { Hasher } from '../ports/cryptography/hasher';

export interface CriarUsuarioRequest {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
}

export type CriarUsuarioResponse = Either<
  UserAlreadyExistsError,
  {
    user: User;
  }
>;

export class CriarUsuarioUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hasher: Hasher,
  ) {}

  async execute(request: CriarUsuarioRequest): Promise<CriarUsuarioResponse> {
    const { nome, email, senha, role } = request;

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      return left(new UserAlreadyExistsError(email));
    }

    const hashedPassword = await this.hasher.hash(senha);

    const user = User.create({
      nome,
      email,
      senha: hashedPassword,
      role,
    });

    await this.userRepository.create(user);

    return right({ user });
  }
}
