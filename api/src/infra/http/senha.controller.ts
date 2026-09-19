import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { RedefinirSenhaUseCase } from '@domain/fivo/application/use-cases/redefinir-senha';
import { SolicitarRecuperacaoSenhaUseCase } from '@domain/fivo/application/use-cases/solicitar-recuperacao-senha';
import { Public } from '@infra/auth/public.decorator';

import { desembrulhar } from './desembrulhar';
import { redefinicaoSchema, recuperacaoSchema } from './senha.dto';
import type { RecuperacaoDto, RedefinicaoDto } from './senha.dto';
import { ZodValidationPipe } from './zod-validation.pipe';

@Public()
@Controller('senha')
export class SenhaController {
  constructor(
    private readonly solicitarRecuperacao: SolicitarRecuperacaoSenhaUseCase,
    private readonly redefinirSenha: RedefinirSenhaUseCase,
  ) {}

  @Post('recuperacao')
  @HttpCode(202)
  async solicitar(
    @Body(new ZodValidationPipe(recuperacaoSchema)) { email }: RecuperacaoDto,
  ): Promise<{ mensagem: string }> {
    desembrulhar(
      await this.solicitarRecuperacao.execute({ email, agora: new Date() }),
    );

    return {
      mensagem:
        'Se o e-mail estiver cadastrado, enviaremos um link de redefinição.',
    };
  }

  @Post('redefinicao')
  @HttpCode(204)
  async redefinir(
    @Body(new ZodValidationPipe(redefinicaoSchema))
    { token, novaSenha }: RedefinicaoDto,
  ): Promise<void> {
    desembrulhar(
      await this.redefinirSenha.execute({
        token,
        novaSenha,
        agora: new Date(),
      }),
    );
  }
}
