import { Senha } from '@domain/fivo/entities/senha';
import { User, UserProps, UserRole } from '@domain/fivo/entities/user';

type UserFactoryProps = Partial<Omit<UserProps, 'senha'>> & {
  senha?: Senha | string;
};

export class UserFactory {
  static create(props: UserFactoryProps = {}): User {
    const { senha, ...rest } = props;

    const senhaVO = UserFactory.resolveSenha(senha);

    const user = User.create({
      nome: 'Admin User',
      email: 'admin@example.com',
      senha: senhaVO,
      role: UserRole.ADMIN,
      ...rest,
    });

    return user;
  }

  private static resolveSenha(senha?: Senha | string): Senha {
    if (senha instanceof Senha) {
      return senha;
    }

    const senhaOrError = Senha.create(senha ?? 'StrongPassword');

    if (senhaOrError.isLeft()) {
      throw new Error('Failed to create user: Invalid password');
    }

    return senhaOrError.value;
  }
}
