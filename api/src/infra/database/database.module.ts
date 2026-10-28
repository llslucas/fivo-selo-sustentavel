import { Global, Module } from '@nestjs/common';

import { CampanhaRepository } from '@domain/fivo/application/ports/database/campanha-repository';
import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { InstituicaoRepository } from '@domain/fivo/application/ports/database/instituicao-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { RegistroAuditoriaRepository } from '@domain/fivo/application/ports/registro-auditoria-repository';
import { SessaoRepository } from '@domain/fivo/application/ports/sessao-repository';
import { UnitOfWork } from '@domain/fivo/application/ports/unit-of-work';
import { TokenSenhaRepository } from '@domain/fivo/application/ports/token-senha-repository';

import { PrismaCampanhaRepository } from './prisma/prisma-campanha-repository';
import { PrismaCausaRepository } from './prisma/prisma-causa-repository';
import { PrismaEmpresaRepository } from './prisma/prisma-empresa-repository';
import { PrismaInstituicaoRepository } from './prisma/prisma-instituicao-repository';
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
