import { Global, Module } from '@nestjs/common';

import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { RegistroAuditoriaRepository } from '@domain/fivo/application/ports/registro-auditoria-repository';
import { SessaoRepository } from '@domain/fivo/application/ports/sessao-repository';
import { UnitOfWork } from '@domain/fivo/application/ports/unit-of-work';
import { TokenSenhaRepository } from '@domain/fivo/application/ports/token-senha-repository';

import { PrismaEmpresaRepository } from './prisma/prisma-empresa-repository';
import { PrismaRegistroAuditoriaRepository } from './prisma/prisma-registro-auditoria-repository';
import { PrismaSessaoRepository } from './prisma/prisma-sessao-repository';
import { PrismaService } from './prisma/prisma.service';
import { PrismaTransactionContext } from './prisma/prisma-transaction-context';
import { PrismaUnitOfWork } from './prisma/prisma-unit-of-work';
import { PrismaTokenSenhaRepository } from './prisma/prisma-token-senha-repository';
import { PrismaUserRepository } from './prisma/prisma-user-repository';

@Global()
@Module({
  imports: [],
  providers: [
    PrismaService,
    PrismaTransactionContext,
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
    { provide: EmpresaRepository, useClass: PrismaEmpresaRepository },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: SessaoRepository, useClass: PrismaSessaoRepository },
    {
      provide: RegistroAuditoriaRepository,
      useClass: PrismaRegistroAuditoriaRepository,
    },
    { provide: TokenSenhaRepository, useClass: PrismaTokenSenhaRepository },
  ],
  exports: [
    PrismaService,
    UnitOfWork,
    EmpresaRepository,
    UserRepository,
    SessaoRepository,
    RegistroAuditoriaRepository,
    TokenSenhaRepository,
  ],
})
export class DatabaseModule {}
