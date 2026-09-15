import { FakeHasher } from '@test/cryptography/fake-hasher';
import { Hasher } from '../ports/cryptography/hasher';
import { UserRepository } from '../ports/database/user-repository';
import { CriarUsuarioUseCase } from './criar-usuario';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { UserRole } from '@domain/fivo/entities/user';

describe('CriarUsuarioUseCase', () => {
  let criarUsuarioUseCase: CriarUsuarioUseCase;
  let UserRepository: UserRepository;
  let hasher: Hasher;

  beforeEach(() => {
    UserRepository = new InMemoryUserRepository();
    hasher = new FakeHasher();
    criarUsuarioUseCase = new CriarUsuarioUseCase(UserRepository, hasher);
  });

  it('should create a new user with hashed password', async () => {
    const request = {
      nome: 'Usuario Teste',
      email: 'usuario@teste.com',
      senha: 'senha123456',
      role: UserRole.ADMIN,
    };

    const response = await criarUsuarioUseCase.execute(request);

    const success = response.isRight();

    expect(success).toBe(true);

    if (success) {
      const { user } = response.value;

      const UserInRepository = await UserRepository.findById(
        user.id.toString(),
      );

      expect(UserInRepository).not.toBeNull();
      expect(UserInRepository?.equals(user)).toBe(true);
      expect(user.senha.valor).toEqual(await hasher.hash(request.senha));
    }
  });

  it('should return an SenhaFracaError if the password is weak', async () => {
    const request = {
      nome: 'Usuario Teste',
      email: 'usuario@teste.com',
      senha: 'senha',
      role: UserRole.ADMIN,
    };

    const response = await criarUsuarioUseCase.execute(request);

    const failure = response.isLeft();

    expect(failure).toBe(true);

    if (failure) {
      expect(response.value).toBeInstanceOf(Error);
    }
  });
});
