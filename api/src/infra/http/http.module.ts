import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AprovarAlteracaoCampanhaUseCase } from '@domain/fivo/campanhas/use-cases/aprovar-alteracao-campanha';
import { AprovarCampanhaUseCase } from '@domain/fivo/campanhas/use-cases/aprovar-campanha';
import { AprovarEmpresaUseCase } from '@domain/fivo/empresas/use-cases/aprovar-empresa';
import { AprovarInstituicaoUseCase } from '@domain/fivo/catalogo/use-cases/aprovar-instituicao';
import { AssegurarBeneficiadaDisponivelUseCase } from '@domain/fivo/catalogo/use-cases/assegurar-beneficiada-disponivel';
import { AssegurarEmpresaAprovadaUseCase } from '@domain/fivo/empresas/use-cases/assegurar-empresa-aprovada';
import { AutenticarUsuarioUseCase } from '@domain/fivo/identidade/use-cases/autenticar-usuario';
import { BuscarCampanhaPublicaUseCase } from '@domain/fivo/campanhas/use-cases/buscar-campanha-publica';
import { ConfirmarTrocaEmailUseCase } from '@domain/fivo/empresas/use-cases/confirmar-troca-email';
import { ConsultarCampanhaDaEmpresaUseCase } from '@domain/fivo/campanhas/use-cases/consultar-campanha-da-empresa';
import { CriarCampanhaUseCase } from '@domain/fivo/campanhas/use-cases/criar-campanha';
import { CriarCausaUseCase } from '@domain/fivo/catalogo/use-cases/criar-causa';
import { CriarEmpresaUseCase } from '@domain/fivo/empresas/use-cases/criar-empresa';
import { CriarInstituicaoUseCase } from '@domain/fivo/catalogo/use-cases/criar-instituicao';
import { EditarCampanhaUseCase } from '@domain/fivo/campanhas/use-cases/editar-campanha';
import { EditarCausaUseCase } from '@domain/fivo/catalogo/use-cases/editar-causa';
import { EditarDadosEmpresaUseCase } from '@domain/fivo/empresas/use-cases/editar-dados-empresa';
import { InativarCausaUseCase } from '@domain/fivo/catalogo/use-cases/inativar-causa';
import { InativarInstituicaoUseCase } from '@domain/fivo/catalogo/use-cases/inativar-instituicao';
import { ListarBeneficiadasUseCase } from '@domain/fivo/catalogo/use-cases/listar-beneficiadas';
import { ListarCausasAtivasUseCase } from '@domain/fivo/catalogo/use-cases/listar-causas-ativas';
import { ListarFilaAprovacaoUseCase } from '@domain/fivo/empresas/use-cases/listar-fila-aprovacao';
import { ListarFilaCampanhasUseCase } from '@domain/fivo/campanhas/use-cases/listar-fila-campanhas';
import { ListarFilaInstituicoesUseCase } from '@domain/fivo/catalogo/use-cases/listar-fila-instituicoes';
import { RedefinirSenhaUseCase } from '@domain/fivo/identidade/use-cases/redefinir-senha';
import { ReativarEmpresaUseCase } from '@domain/fivo/empresas/use-cases/reativar-empresa';
import { ReativarInstituicaoUseCase } from '@domain/fivo/catalogo/use-cases/reativar-instituicao';
import { RejeitarAlteracaoCampanhaUseCase } from '@domain/fivo/campanhas/use-cases/rejeitar-alteracao-campanha';
import { RejeitarCampanhaUseCase } from '@domain/fivo/campanhas/use-cases/rejeitar-campanha';
import { RejeitarEmpresaUseCase } from '@domain/fivo/empresas/use-cases/rejeitar-empresa';
import { RejeitarInstituicaoUseCase } from '@domain/fivo/catalogo/use-cases/rejeitar-instituicao';
import { SolicitarRecuperacaoSenhaUseCase } from '@domain/fivo/identidade/use-cases/solicitar-recuperacao-senha';
import { SubmeterCampanhaUseCase } from '@domain/fivo/campanhas/use-cases/submeter-campanha';
import { SuspenderEmpresaUseCase } from '@domain/fivo/empresas/use-cases/suspender-empresa';
import { SuspenderInstituicaoUseCase } from '@domain/fivo/catalogo/use-cases/suspender-instituicao';
import { ArquivoModule } from '@infra/arquivo/arquivo.module';
import { AuthModule } from '@infra/auth/auth.module';
import { CryptographyModule } from '@infra/cryptography/cryptography.module';
import { MailModule } from '@infra/mail/mail.module';

import { AdminCampanhasController } from './campanhas/admin-campanhas.controller';
import { AdminCausasController } from './catalogo/admin-causas.controller';
import { AdminEmpresasController } from './empresas/admin-empresas.controller';
import { AdminInstituicoesController } from './catalogo/admin-instituicoes.controller';
import { ArquivoController } from './arquivo/arquivo.controller';
import { AutenticacaoController } from './identidade/autenticacao.controller';
import { BeneficiadasController } from './catalogo/beneficiadas.controller';
import { CadastroEmpresaController } from './empresas/cadastro-empresa.controller';
import { CadastroInstituicaoController } from './catalogo/cadastro-instituicao.controller';
import { CampanhasController } from './campanhas/campanhas.controller';
import { CampanhasPublicasController } from './campanhas/campanhas-publicas.controller';
import { CausasController } from './catalogo/causas.controller';
import { DomainExceptionFilter } from './domain-exception.filter';
import { SenhaController } from './identidade/senha.controller';

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
    AdminCampanhasController,
    CampanhasPublicasController,
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
    SubmeterCampanhaUseCase,
    ListarFilaCampanhasUseCase,
    AprovarCampanhaUseCase,
    RejeitarCampanhaUseCase,
    AprovarAlteracaoCampanhaUseCase,
    RejeitarAlteracaoCampanhaUseCase,
    BuscarCampanhaPublicaUseCase,
  ],
})
export class HttpModule {}
