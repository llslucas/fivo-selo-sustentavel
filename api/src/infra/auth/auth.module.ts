import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { CryptographyModule } from '@infra/cryptography/cryptography.module';

import { AdminSeeder } from './admin-seeder';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SessionService } from './session.service';

@Module({
  imports: [CryptographyModule],
  providers: [
    SessionService,
    AdminSeeder,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [SessionService],
})
export class AuthModule {}
