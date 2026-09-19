import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { UserAlreadyExistsError } from '@domain/fivo/application/errors/users-already-exists.error';
import { Hasher } from '@domain/fivo/application/ports/cryptography/hasher';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Senha } from '@domain/fivo/entities/senha';
import { User, UserRole } from '@domain/fivo/entities/user';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hasher: Hasher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.executar();
  }

  async executar(): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const senha = process.env.ADMIN_SENHA;

    if (!email || !senha) {
      return;
    }

    if (await this.userRepository.findByEmail(email)) {
      return;
    }

    const senhaOuErro = Senha.create(senha);

    if (senhaOuErro.isLeft()) {
      throw new Error(`ADMIN_SENHA inválida: ${senhaOuErro.value.message}`);
    }

    const admin = User.create({
      nome: process.env.ADMIN_NOME ?? 'Administrador Fivo',
      email,
      senha: await senhaOuErro.value.hash(this.hasher),
      role: UserRole.ADMIN,
    });

    try {
      await this.userRepository.create(admin);
    } catch (erro) {
      if (!(erro instanceof UserAlreadyExistsError)) {
        throw erro;
      }
    }
  }
}
