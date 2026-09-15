import { Senha } from '@domain/fivo/entities/senha';
import { User, UserProps, UserRole } from '@domain/fivo/entities/user';

export class UserFactory {
  static create(props: Partial<UserProps> = {}): User {
    const senhaOrError = Senha.create('StrongPassword');

    if (senhaOrError.isLeft()) {
      throw new Error('Failed to create user: Invalid password');
    }

    const user = User.create({
      nome: 'Admin User',
      email: 'admin@example.com',
      senha: senhaOrError.value,
      role: UserRole.ADMIN,
      ...props,
    });

    return user;
  }
}
