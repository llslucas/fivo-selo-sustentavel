import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { User } from '@domain/fivo/entities/user';

export class InMemoryUserRepository implements UserRepository {
  public items: User[] = [];

  findById(id: string): Promise<User | null> {
    const user = this.items.find((item) => item.id.toString() === id);
    return Promise.resolve(user ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    const user = this.items.find((item) => item.email === email);
    return Promise.resolve(user ?? null);
  }

  create(user: User): Promise<void> {
    this.items.push(user);
    return Promise.resolve();
  }

  save(user: User): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(user.id));

    if (index !== -1) {
      this.items[index] = user;
    }

    return Promise.resolve();
  }
}
