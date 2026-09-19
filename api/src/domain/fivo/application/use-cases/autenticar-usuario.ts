import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { ContaBloqueadaError } from '../errors/conta-bloqueada.error';
import { CredenciaisInvalidasError } from '../errors/wrong-credentials.error';
import { gerarTokenDeSessao } from '../gerar-token-de-sessao';
import { Hasher } from '../ports/cryptography/hasher';
import { UserRepository } from '../ports/database/user-repository';
import { SessaoRepository } from '../ports/sessao-repository';
import { UnitOfWork } from '../ports/unit-of-work';

export interface AutenticarUsuarioUseCaseRequest {
  email: string;
  senha: string;
  agora: Date;
  ip?: string;
  userAgent?: string;
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
    ip,
    userAgent,
  }: AutenticarUsuarioUseCaseRequest): Promise<AutenticarUsuarioUseCaseResponse> {
    const emailNormalizado = email.toLowerCase();
    const inicial = await this.userRepository.findByEmail(emailNormalizado);

    if (!inicial) {
      return left(new CredenciaisInvalidasError());
    }

    if (inicial.estaBloqueado(agora)) {
      return left(new ContaBloqueadaError());
    }

    // O hash (lento) roda fora do lock para não prender conexões do pool.
    const senhaValida = await this.hasher.compare(senha, inicial.senha.valor);

    // Só a decisão e a gravação do contador ficam sob lock de linha; sem isso,
    // tentativas paralelas leem o mesmo `falhasLogin` e o bloqueio de 5 falhas
    // (EMP-07 AC3) deixa de valer.
    const autenticado = await this.unitOfWork.executar<
      Either<CredenciaisInvalidasError | ContaBloqueadaError, User>
    >(async () => {
      const user =
        await this.userRepository.findByEmailParaAtualizacao(emailNormalizado);

      if (!user) {
        return left(new CredenciaisInvalidasError());
      }

      if (user.estaBloqueado(agora)) {
        return left(new ContaBloqueadaError());
      }

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

    const { token, tokenHash } = gerarTokenDeSessao();

    await this.sessaoRepository.criar({
      id: randomUUID(),
      usuarioId: user.id.toString(),
      tokenHash,
      criadaEm: agora,
      ultimoAcessoEm: agora,
      ip,
      userAgent,
    });

    return right({ token, papel: user.role });
  }
}
