import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { ContaBloqueadaError } from '../errors/conta-bloqueada.error';
import { CredenciaisInvalidasError } from '../errors/wrong-credentials.error';
import { Hasher } from '../ports/cryptography/hasher';
import { UserRepository } from '../ports/database/user-repository';
import { SessaoRepository } from '../ports/sessao-repository';
import { UnitOfWork } from '../ports/unit-of-work';

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
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute({
    email,
    senha,
    agora,
  }: AutenticarUsuarioUseCaseRequest): Promise<AutenticarUsuarioUseCaseResponse> {
    // A linha do usuário fica travada durante a checagem e a gravação do
    // contador, senão tentativas paralelas leem o mesmo `falhasLogin` e o
    // bloqueio de 5 falhas (EMP-07 AC3) deixa de valer.
    const autenticado = await this.unitOfWork.executar<
      Either<CredenciaisInvalidasError | ContaBloqueadaError, User>
    >(async () => {
      const user = await this.userRepository.findByEmailParaAtualizacao(
        email.toLowerCase(),
      );

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

      return right(user);
    });

    if (autenticado.isLeft()) {
      return left(autenticado.value);
    }

    const user = autenticado.value;

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
