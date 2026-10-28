import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import request from 'supertest';
import { z } from 'zod';

import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { ArquivoInvalidoError } from '@domain/fivo/shared/errors/arquivo-invalido.error';
import { CnpjImutavelError } from '@domain/fivo/empresas/errors/cnpj-imutavel.error';
import { ContaBloqueadaError } from '@domain/fivo/identidade/errors/conta-bloqueada.error';
import { EmpresaAlreadyExistsError } from '@domain/fivo/empresas/errors/empresa-already-exists.error';
import { InstituicaoAlreadyExistsError } from '@domain/fivo/catalogo/errors/instituicao-already-exists.error';
import { InvalidCnpjError } from '@domain/fivo/shared/errors/invalid-cnpj.error';
import { InvalidRuleValueError } from '@domain/fivo/campanhas/errors/invalid-rule-value.error';
import { MotivoInsuficienteError } from '@domain/fivo/shared/errors/motivo-insuficiente.error';
import { SenhaFracaError } from '@domain/fivo/identidade/errors/senha-fraca.error';
import { StorageIndisponivelError } from '@domain/fivo/shared/errors/storage-indisponivel.error';
import { TokenConfirmacaoEmailInvalidoError } from '@domain/fivo/empresas/errors/token-confirmacao-email-invalido.error';
import { TokenInvalidoError } from '@domain/fivo/identidade/errors/token-invalido.error';
import { TransicaoInvalidaError } from '@domain/fivo/shared/errors/transicao-invalida.error';
import { UserAlreadyExistsError } from '@domain/fivo/identidade/errors/users-already-exists.error';
import { CredenciaisInvalidasError } from '@domain/fivo/identidade/errors/wrong-credentials.error';
import { Public } from '@infra/auth/decorators/public.decorator';
import { ZodValidationPipe } from '@infra/http/pipes/zod-validation.pipe';
import {
  AppDeTeste,
  criarAppDeTeste,
  servidorHttp,
} from '@test/helpers/e2e-app';

const ERROS_DE_DOMINIO: Record<string, () => Error> = {
  'arquivo-invalido': () => new ArquivoInvalidoError('Logo acima de 5 MB'),
  'cnpj-imutavel': () => new CnpjImutavelError(),
  'conta-bloqueada': () => new ContaBloqueadaError(),
  'empresa-ja-existe': () => new EmpresaAlreadyExistsError(),
  'instituicao-ja-existe': () => new InstituicaoAlreadyExistsError(),
  'cnpj-invalido': () => new InvalidCnpjError(),
  'regra-invalida': () => new InvalidRuleValueError(),
  'motivo-insuficiente': () => new MotivoInsuficienteError(),
  'senha-fraca': () => new SenhaFracaError(),
  'storage-indisponivel': () => new StorageIndisponivelError(),
  'token-invalido': () => new TokenInvalidoError(),
  'token-confirmacao-email-invalido': () =>
    new TokenConfirmacaoEmailInvalidoError(),
  'transicao-invalida': () => new TransicaoInvalidaError(),
  'usuario-ja-existe': () => new UserAlreadyExistsError(),
  'credenciais-invalidas': () => new CredenciaisInvalidasError(),
  'nao-permitido': () => new NotAllowedError(),
  'recurso-nao-encontrado': () => new ResourceNotFoundError('Empresa'),
};

// Tabela "Error Handling Strategy" do design.md.
const STATUS_ESPERADO: Record<string, number> = {
  'arquivo-invalido': 422,
  'cnpj-imutavel': 422,
  'conta-bloqueada': 429,
  'empresa-ja-existe': 409,
  'instituicao-ja-existe': 409,
  'cnpj-invalido': 422,
  'regra-invalida': 422,
  'motivo-insuficiente': 422,
  'senha-fraca': 422,
  'storage-indisponivel': 503,
  'token-invalido': 400,
  'token-confirmacao-email-invalido': 400,
  'transicao-invalida': 409,
  'usuario-ja-existe': 409,
  'credenciais-invalidas': 401,
  'nao-permitido': 403,
  'recurso-nao-encontrado': 404,
};

// Erros genéricos do `core` não carregam status nem mensagem em pt-BR; o filtro
// traduz (design.md: "Acesso negado" no 403).
const MENSAGEM_ESPERADA: Record<string, string> = {
  'nao-permitido': 'Acesso negado',
  'recurso-nao-encontrado': 'Recurso não encontrado',
};

const esquemaDeProva = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  idade: z.number(),
});

@Public()
@Controller('prova')
class ProvaController {
  @Get('erro-de-dominio/:nome')
  lancarErroDeDominio(@Param('nome') nome: string): never {
    throw ERROS_DE_DOMINIO[nome]();
  }

  @Get('nest-nativo')
  lancarNotFound(): never {
    throw new NotFoundException('nada aqui');
  }

  @Get('erro-inesperado')
  lancarErroInesperado(): never {
    throw new Error('detalhe interno que não pode vazar');
  }

  @Post('validacao')
  validar(@Body(new ZodValidationPipe(esquemaDeProva)) corpo: unknown) {
    return corpo;
  }
}

describe('DomainExceptionFilter e ZodValidationPipe (e2e)', () => {
  let contexto: AppDeTeste;

  beforeAll(async () => {
    contexto = await criarAppDeTeste({ controllers: [ProvaController] });
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it.each(Object.keys(ERROS_DE_DOMINIO))(
    'mapeia o erro de domínio "%s" para o status e a mensagem do erro',
    async (nome) => {
      const mensagem =
        MENSAGEM_ESPERADA[nome] ?? ERROS_DE_DOMINIO[nome]().message;

      const resposta = await request(servidorHttp(contexto)).get(
        `/prova/erro-de-dominio/${nome}`,
      );

      expect(resposta.status).toBe(STATUS_ESPERADO[nome]);
      expect(resposta.body).toEqual({
        statusCode: STATUS_ESPERADO[nome],
        message: mensagem,
      });
    },
  );

  it('ZodValidationPipe devolve 422 com o campo inválido e a mensagem', async () => {
    const resposta = await request(servidorHttp(contexto))
      .post('/prova/validacao')
      .send({ nome: '', idade: 30 });

    expect(resposta.status).toBe(422);
    expect(resposta.body).toMatchObject({
      statusCode: 422,
      message: 'Nome é obrigatório',
      errors: [{ campo: 'nome', mensagem: 'Nome é obrigatório' }],
    });
  });

  it('ZodValidationPipe aceita o corpo válido e entrega o dado tipado', async () => {
    const resposta = await request(servidorHttp(contexto))
      .post('/prova/validacao')
      .send({ nome: 'Ana', idade: 30 });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ nome: 'Ana', idade: 30 });
  });

  it('exceção nativa do Nest mantém o comportamento padrão', async () => {
    const resposta = await request(servidorHttp(contexto)).get(
      '/prova/nest-nativo',
    );

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({
      message: 'nada aqui',
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('erro sem status vira 500 genérico sem vazar a mensagem interna', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const resposta = await request(servidorHttp(contexto)).get(
      '/prova/erro-inesperado',
    );

    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
