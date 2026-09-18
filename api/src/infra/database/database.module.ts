import { Global, Module } from '@nestjs/common';

import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';

import { PrismaEmpresaRepository } from './prisma/prisma-empresa-repository';
import { PrismaService } from './prisma/prisma.service';
import { PrismaUserRepository } from './prisma/prisma-user-repository';

@Global()
@Module({
  imports: [],
  providers: [
    PrismaService,
    { provide: EmpresaRepository, useClass: PrismaEmpresaRepository },
    { provide: UserRepository, useClass: PrismaUserRepository },
  ],
  exports: [PrismaService, EmpresaRepository, UserRepository],
})
export class DatabaseModule {}
