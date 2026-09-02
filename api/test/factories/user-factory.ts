import { User, UserProps, UserType } from '@domain/fivo/entities/user';

export class UserFactory {
  static create(props: Partial<UserProps> = {}): User {
    const user = User.create({
      nome: 'Admin User',
      email: 'admin@example.com',
      senha: 'password',
      type: UserType.ADMIN,
      ...props,
    });

    return user;
  }
}
