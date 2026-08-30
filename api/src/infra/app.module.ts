import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { CryptographyModule } from './cryptography/cryptography.module';
import { DatabaseModule } from './database/database.module';
import { HttpModule } from './http/http.module';

@Module({
  imports: [DatabaseModule, CryptographyModule, AuthModule, HttpModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
