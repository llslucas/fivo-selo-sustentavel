import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { ContaBloqueadaError } from '../errors/conta-bloqueada.error';
import { CredenciaisInvalidasError } from '../errors/wrong-credentials.error';
import { Hasher } from '../ports/cryptography/hasher';
import { UserRepository } from '../ports/database/user-repository';
import { SessaoRepository } from '../ports/sessao-repository';

const TOKEN_BYTES = 32; // 256 bits

export interface AutenticarUsuarioUseCaseRequest {
  email: string;
  senha: string;
  agora: Date;
}

export type AutenticarUsuarioUseCaseResponse = Either<
  CredenciaisInvalidasError | ContaBloqueadaError,
  {
    token: string;
    papel: UserRole;
  }
>;

@Injectable()
export class AutenticarUsuarioUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hasher: Hasher,
    private readonly sessaoRepository: SessaoRepository,
  ) {}

  async execute({
    email,
    senha,
    agora,
  }: AutenticarUsuarioUseCaseRequest): Promise<AutenticarUsuarioUseCaseResponse> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());

    if (!user) {
      return left(new CredenciaisInvalidasError());
    }

    if (user.estaBloqueado(agora)) {
      return left(new ContaBloqueadaError());
    }

    const senhaValida = await this.hasher.compare(senha, user.senha.valor);

    if (!senhaValida) {
      user.registrarFalhaDeLogin(agora);
      await this.userRepository.save(user);
      return left(new CredenciaisInvalidasError());
    }

    user.registrarLoginOk();
    await this.userRepository.save(user);

    const tokenBruto = randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = createHash('sha256').update(tokenBruto).digest('hex');

    await this.sessaoRepository.criar({
      id: randomUUID(),
      usuarioId: user.id.toString(),
      tokenHash,
      criadaEm: agora,
      ultimoAcessoEm: agora,
    });

    return right({ token: tokenBruto, papel: user.role });
  }
}
