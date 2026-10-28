import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AprovarEmpresaUseCase } from '@domain/fivo/application/use-cases/aprovar-empresa';
import { AprovarInstituicaoUseCase } from '@domain/fivo/application/use-cases/aprovar-instituicao';
import { AssegurarBeneficiadaDisponivelUseCase } from '@domain/fivo/application/use-cases/assegurar-beneficiada-disponivel';
import { AssegurarEmpresaAprovadaUseCase } from '@domain/fivo/application/use-cases/assegurar-empresa-aprovada';
import { AutenticarUsuarioUseCase } from '@domain/fivo/application/use-cases/autenticar-usuario';
import { ConfirmarTrocaEmailUseCase } from '@domain/fivo/application/use-cases/confirmar-troca-email';
import { ConsultarCampanhaDaEmpresaUseCase } from '@domain/fivo/application/use-cases/consultar-campanha-da-empresa';
import { CriarCampanhaUseCase } from '@domain/fivo/application/use-cases/criar-campanha';
import { CriarCausaUseCase } from '@domain/fivo/application/use-cases/criar-causa';
import { CriarEmpresaUseCase } from '@domain/fivo/application/use-cases/criar-empresa';
import { CriarInstituicaoUseCase } from '@domain/fivo/application/use-cases/criar-instituicao';
import { EditarCampanhaUseCase } from '@domain/fivo/application/use-cases/editar-campanha';
import { EditarCausaUseCase } from '@domain/fivo/application/use-cases/editar-causa';
import { EditarDadosEmpresaUseCase } from '@domain/fivo/application/use-cases/editar-dados-empresa';
import { InativarCausaUseCase } from '@domain/fivo/application/use-cases/inativar-causa';
import { InativarInstituicaoUseCase } from '@domain/fivo/application/use-cases/inativar-instituicao';
import { ListarBeneficiadasUseCase } from '@domain/fivo/application/use-cases/listar-beneficiadas';
import { ListarCausasAtivasUseCase } from '@domain/fivo/application/use-cases/listar-causas-ativas';
import { ListarFilaAprovacaoUseCase } from '@domain/fivo/application/use-cases/listar-fila-aprovacao';
import { ListarFilaInstituicoesUseCase } from '@domain/fivo/application/use-cases/listar-fila-instituicoes';
import { RedefinirSenhaUseCase } from '@domain/fivo/application/use-cases/redefinir-senha';
import { ReativarEmpresaUseCase } from '@domain/fivo/application/use-cases/reativar-empresa';
import { ReativarInstituicaoUseCase } from '@domain/fivo/application/use-cases/reativar-instituicao';
import { RejeitarEmpresaUseCase } from '@domain/fivo/application/use-cases/rejeitar-empresa';
import { RejeitarInstituicaoUseCase } from '@domain/fivo/application/use-cases/rejeitar-instituicao';
import { SolicitarRecuperacaoSenhaUseCase } from '@domain/fivo/application/use-cases/solicitar-recuperacao-senha';
import { SuspenderEmpresaUseCase } from '@domain/fivo/application/use-cases/suspender-empresa';
import { SuspenderInstituicaoUseCase } from '@domain/fivo/application/use-cases/suspender-instituicao';
import { ArquivoModule } from '@infra/arquivo/arquivo.module';
import { AuthModule } from '@infra/auth/auth.module';
import { CryptographyModule } from '@infra/cryptography/cryptography.module';
import { MailModule } from '@infra/mail/mail.module';

import { AdminCausasController } from './controllers/admin-causas.controller';
import { AdminEmpresasController } from './controllers/admin-empresas.controller';
import { AdminInstituicoesController } from './controllers/admin-instituicoes.controller';
import { ArquivoController } from './controllers/arquivo.controller';
import { AutenticacaoController } from './controllers/autenticacao.controller';
import { BeneficiadasController } from './controllers/beneficiadas.controller';
import { CadastroEmpresaController } from './controllers/cadastro-empresa.controller';
import { CadastroInstituicaoController } from './controllers/cadastro-instituicao.controller';
import { CampanhasController } from './controllers/campanhas.controller';
import { CausasController } from './controllers/causas.controller';
import { DomainExceptionFilter } from './domain-exception.filter';
import { SenhaController } from './controllers/senha.controller';

@Module({
  imports: [ArquivoModule, AuthModule, CryptographyModule, MailModule],
  controllers: [
    CadastroEmpresaController,
    AutenticacaoController,
    AdminEmpresasController,
    AdminCausasController,
    CausasController,
    CadastroInstituicaoController,
    AdminInstituicoesController,
    BeneficiadasController,
    ArquivoController,
    SenhaController,
    CampanhasController,
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
    EditarDadosEmpresaUseCase,
    ConfirmarTrocaEmailUseCase,
    SolicitarRecuperacaoSenhaUseCase,
    RedefinirSenhaUseCase,
    CriarCausaUseCase,
    EditarCausaUseCase,
    InativarCausaUseCase,
    ListarCausasAtivasUseCase,
    CriarInstituicaoUseCase,
    ListarFilaInstituicoesUseCase,
    AprovarInstituicaoUseCase,
    RejeitarInstituicaoUseCase,
    SuspenderInstituicaoUseCase,
    ReativarInstituicaoUseCase,
    InativarInstituicaoUseCase,
    AssegurarEmpresaAprovadaUseCase,
    ListarBeneficiadasUseCase,
    AssegurarBeneficiadaDisponivelUseCase,
    CriarCampanhaUseCase,
    ConsultarCampanhaDaEmpresaUseCase,
    EditarCampanhaUseCase,
  ],
})
export class HttpModule {}
