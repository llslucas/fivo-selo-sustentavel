import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AprovarEmpresaUseCase } from '@domain/fivo/application/use-cases/aprovar-empresa';
import { AutenticarUsuarioUseCase } from '@domain/fivo/application/use-cases/autenticar-usuario';
import { CriarEmpresaUseCase } from '@domain/fivo/application/use-cases/criar-empresa';
import { ListarFilaAprovacaoUseCase } from '@domain/fivo/application/use-cases/listar-fila-aprovacao';
import { ReativarEmpresaUseCase } from '@domain/fivo/application/use-cases/reativar-empresa';
import { RejeitarEmpresaUseCase } from '@domain/fivo/application/use-cases/rejeitar-empresa';
import { SuspenderEmpresaUseCase } from '@domain/fivo/application/use-cases/suspender-empresa';
import { ArquivoModule } from '@infra/arquivo/arquivo.module';
import { AuthModule } from '@infra/auth/auth.module';
import { CryptographyModule } from '@infra/cryptography/cryptography.module';
import { MailModule } from '@infra/mail/mail.module';

import { AdminEmpresasController } from './admin-empresas.controller';
import { ArquivoController } from './arquivo.controller';
import { AutenticacaoController } from './autenticacao.controller';
import { CadastroEmpresaController } from './cadastro-empresa.controller';
import { DomainExceptionFilter } from './domain-exception.filter';

@Module({
  imports: [ArquivoModule, AuthModule, CryptographyModule, MailModule],
  controllers: [
    CadastroEmpresaController,
    AutenticacaoController,
    AdminEmpresasController,
    ArquivoController,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    CriarEmpresaUseCase,
    AutenticarUsuarioUseCase,
    ListarFilaAprovacaoUseCase,
    AprovarEmpresaUseCase,
    RejeitarEmpresaUseCase,
    SuspenderEmpresaUseCase,
    ReativarEmpresaUseCase,
  ],
})
export class HttpModule {}
