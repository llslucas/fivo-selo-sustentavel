import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { DomainExceptionFilter } from './domain-exception.filter';

@Module({
  imports: [],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class HttpModule {}
