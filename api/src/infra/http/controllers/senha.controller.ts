import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RedefinirSenhaUseCase } from '@domain/fivo/application/use-cases/redefinir-senha';
import { SolicitarRecuperacaoSenhaUseCase } from '@domain/fivo/application/use-cases/solicitar-recuperacao-senha';
import { Public } from '@infra/auth/decorators/public.decorator';

import { desembrulhar } from '../desembrulhar';
import { ApiErro } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { redefinicaoSchema, recuperacaoSchema } from '../senha.dto';
import type { RecuperacaoDto, RedefinicaoDto } from '../senha.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

const CORPO_RECUPERACAO = esquemaOpenApi('RecuperacaoSenha', recuperacaoSchema);
const CORPO_REDEFINICAO = esquemaOpenApi('RedefinicaoSenha', redefinicaoSchema);

@ApiTags('senha')
@Public()
@Controller('senha')
export class SenhaController {
  constructor(
    private readonly solicitarRecuperacao: SolicitarRecuperacaoSenhaUseCase,
    private readonly redefinirSenha: RedefinirSenhaUseCase,
  ) {}

  @ApiOperation({ summary: 'Solicita o link de redefinição de senha' })
  @ApiBody({ schema: CORPO_RECUPERACAO })
  @ApiResponse({
    status: 202,
    description:
      'Resposta neutra: igual para e-mail cadastrado ou não, sem revelar a existência da conta',
    schema: {
      type: 'object',
      required: ['mensagem'],
      properties: { mensagem: { type: 'string' } },
    },
  })
  @ApiErro(422, 'Dados inválidos')
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

  @ApiOperation({ summary: 'Redefine a senha com o token do link' })
  @ApiBody({ schema: CORPO_REDEFINICAO })
  @ApiResponse({ status: 204, description: 'Senha redefinida' })
  @ApiErro(400, 'Link de redefinição inválido ou expirado')
  @ApiErro(422, 'Dados inválidos ou senha fraca')
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
