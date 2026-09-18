import { createHash } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { Senha } from '@domain/fivo/entities/senha';
import { User } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { SenhaFracaError } from '../errors/senha-fraca.error';
import { TokenInvalidoError } from '../errors/token-invalido.error';
import { Hasher } from '../ports/cryptography/hasher';
import { UserRepository } from '../ports/database/user-repository';
import { SessaoRepository } from '../ports/sessao-repository';
import { TokenSenhaRepository } from '../ports/token-senha-repository';

interface RedefinirSenhaUseCaseRequest {
  token: string;
  novaSenha: string;
  agora: Date;
}

export type RedefinirSenhaUseCaseResponse = Either<
  TokenInvalidoError | SenhaFracaError,
  void
>;

@Injectable()
export class RedefinirSenhaUseCase {
  constructor(
    private readonly tokenSenhaRepository: TokenSenhaRepository,
    private readonly userRepository: UserRepository,
    private readonly hasher: Hasher,
    private readonly sessaoRepository: SessaoRepository,
  ) {}

  async execute({
    token,
    novaSenha,
    agora,
  }: RedefinirSenhaUseCaseRequest): Promise<RedefinirSenhaUseCaseResponse> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const tokenSenha = await this.tokenSenhaRepository.buscarPorHash(tokenHash);

    const tokenValido =
      tokenSenha &&
      !tokenSenha.usadoEm &&
      tokenSenha.expiraEm.getTime() > agora.getTime();

    if (!tokenValido) {
      return left(new TokenInvalidoError());
    }

    const senhaOrError = Senha.create(novaSenha);

    if (senhaOrError.isLeft()) {
      return left(senhaOrError.value);
    }

    const user = await this.userRepository.findById(tokenSenha.usuarioId);

    if (!user) {
      return left(new TokenInvalidoError());
    }

    const senhaHash = await senhaOrError.value.hash(this.hasher);

    const usuarioAtualizado = User.create(
      {
        nome: user.nome,
        email: user.email,
        senha: senhaHash,
        role: user.role,
        falhasLogin: user.falhasLogin,
        primeiraFalhaEm: user.primeiraFalhaEm,
        bloqueadoAte: user.bloqueadoAte,
        createdAt: user.createdAt,
        updatedAt: agora,
      },
      user.id,
    );

    await this.userRepository.save(usuarioAtualizado);
    await this.sessaoRepository.revogarTodasDoUsuario(user.id.toString());
    await this.tokenSenhaRepository.marcarUsado(tokenSenha.id);

    return right(undefined);
  }
}
