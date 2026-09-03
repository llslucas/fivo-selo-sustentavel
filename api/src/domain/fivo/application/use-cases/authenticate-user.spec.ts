import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { UserRepository } from '../ports/database/user-repository';
import { Hasher } from '../ports/cryptography/hasher';
import { Encrypter } from '../ports/cryptography/encrypter';
import { AuthenticateUserUseCase } from './authenticate-user';
import { FakeHasher } from '@test/cryptography/fake-hasher';
import { FakeEncrypter } from '@test/cryptography/fake-encrypter';
import { UserFactory } from '@test/factories/user-factory';
import { AccessTokenPayload } from '@domain/fivo/entities/user';

describe('AuthenticateUserUseCase', () => {
  let userRepository: UserRepository;
  let hasher: Hasher;
  let encrypter: Encrypter;
  let authenticateUserUseCase: AuthenticateUserUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    hasher = new FakeHasher();
    encrypter = new FakeEncrypter();
    authenticateUserUseCase = new AuthenticateUserUseCase(
      userRepository,
      hasher,
      encrypter,
    );
  });

  it('should return an access token for valid credentials', async () => {
    const user = UserFactory.create({
      email: 'john@example.com',
      senha: await hasher.hash('hashed-password'),
    });

    await userRepository.create(user);

    const result = await authenticateUserUseCase.execute({
      email: 'john@example.com',
      password: 'hashed-password',
    });

    if (result.isLeft()) {
      throw result.value;
    }

    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('accessToken');

    const accessToken = JSON.parse(
      result.value.accessToken,
    ) as AccessTokenPayload;

    expect(accessToken).toEqual({
      sub: user.id,
      role: user.role,
    });
  });
});
