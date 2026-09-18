import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Either, right } from '@core/either';
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../ports/database/user-repository';
import { Mailer, TemplateEmail } from '../ports/mailer';
import { TokenSenhaRepository } from '../ports/token-senha-repository';

const TOKEN_BYTES = 32;
const EXPIRACAO_MINUTOS = 60;
const MINUTE_IN_MILLISECONDS = 60_000;

interface SolicitarRecuperacaoSenhaUseCaseRequest {
  email: string;
  agora: Date;
}

export type SolicitarRecuperacaoSenhaUseCaseResponse = Either<never, void>;

@Injectable()
export class SolicitarRecuperacaoSenhaUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenSenhaRepository: TokenSenhaRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute({
    email,
    agora,
  }: SolicitarRecuperacaoSenhaUseCaseRequest): Promise<SolicitarRecuperacaoSenhaUseCaseResponse> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());

    if (user) {
      const tokenBruto = randomBytes(TOKEN_BYTES).toString('hex');
      const tokenHash = createHash('sha256').update(tokenBruto).digest('hex');

      await this.tokenSenhaRepository.criar({
        id: randomUUID(),
        usuarioId: user.id.toString(),
        tokenHash,
        criadoEm: agora,
        expiraEm: new Date(
          agora.getTime() + EXPIRACAO_MINUTOS * MINUTE_IN_MILLISECONDS,
        ),
      });

      try {
        await this.mailer.enviar({
          para: email,
          template: TemplateEmail.SENHA_REDEFINICAO,
          dados: { token: tokenBruto },
        });
      } catch (error) {
        console.error('Falha ao enviar e-mail de recuperação de senha', error);
      }
    }

    return right(undefined);
  }
}
