import { Global, Module } from '@nestjs/common';

import { CampanhaRepository } from '@domain/fivo/campanhas/ports/campanha-repository';
import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { InstituicaoRepository } from '@domain/fivo/catalogo/ports/instituicao-repository';
import { UserRepository } from '@domain/fivo/identidade/ports/user-repository';
import { RegistroAuditoriaRepository } from '@domain/fivo/shared/ports/registro-auditoria-repository';
import { SessaoRepository } from '@domain/fivo/identidade/ports/sessao-repository';
import { UnitOfWork } from '@domain/fivo/shared/ports/unit-of-work';
import { TokenSenhaRepository } from '@domain/fivo/identidade/ports/token-senha-repository';

import { PrismaCampanhaRepository } from './prisma/repositories/prisma-campanha-repository';
import { PrismaCausaRepository } from './prisma/repositories/prisma-causa-repository';
import { PrismaEmpresaRepository } from './prisma/repositories/prisma-empresa-repository';
import { PrismaInstituicaoRepository } from './prisma/repositories/prisma-instituicao-repository';
import { PrismaRegistroAuditoriaRepository } from './prisma/repositories/prisma-registro-auditoria-repository';
import { PrismaSessaoRepository } from './prisma/repositories/prisma-sessao-repository';
import { PrismaService } from './prisma/prisma.service';
import { PrismaTransactionContext } from './prisma/prisma-transaction-context';
import { PrismaUnitOfWork } from './prisma/prisma-unit-of-work';
import { PrismaTokenSenhaRepository } from './prisma/repositories/prisma-token-senha-repository';
import { PrismaUserRepository } from './prisma/repositories/prisma-user-repository';

@Global()
@Module({
  imports: [],
  providers: [
    PrismaService,
    PrismaTransactionContext,
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
    { provide: EmpresaRepository, useClass: PrismaEmpresaRepository },
    { provide: CausaRepository, useClass: PrismaCausaRepository },
    { provide: InstituicaoRepository, useClass: PrismaInstituicaoRepository },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: SessaoRepository, useClass: PrismaSessaoRepository },
    {
      provide: RegistroAuditoriaRepository,
      useClass: PrismaRegistroAuditoriaRepository,
    },
    { provide: TokenSenhaRepository, useClass: PrismaTokenSenhaRepository },
    { provide: CampanhaRepository, useClass: PrismaCampanhaRepository },
  ],
  exports: [
    PrismaService,
    UnitOfWork,
    EmpresaRepository,
    CausaRepository,
    InstituicaoRepository,
    UserRepository,
    SessaoRepository,
    RegistroAuditoriaRepository,
    TokenSenhaRepository,
    CampanhaRepository,
  ],
})
export class DatabaseModule {}
