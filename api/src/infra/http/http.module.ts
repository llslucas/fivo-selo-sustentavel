import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AutenticarUsuarioUseCase } from '@domain/fivo/application/use-cases/autenticar-usuario';
import { CriarEmpresaUseCase } from '@domain/fivo/application/use-cases/criar-empresa';
import { ArquivoModule } from '@infra/arquivo/arquivo.module';
import { AuthModule } from '@infra/auth/auth.module';
import { CryptographyModule } from '@infra/cryptography/cryptography.module';
import { MailModule } from '@infra/mail/mail.module';

import { AutenticacaoController } from './autenticacao.controller';
import { CadastroEmpresaController } from './cadastro-empresa.controller';
import { DomainExceptionFilter } from './domain-exception.filter';

@Module({
  imports: [ArquivoModule, AuthModule, CryptographyModule, MailModule],
  controllers: [CadastroEmpresaController, AutenticacaoController],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    CriarEmpresaUseCase,
    AutenticarUsuarioUseCase,
  ],
})
export class HttpModule {}
