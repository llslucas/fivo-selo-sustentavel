import { Mailer } from '@domain/fivo/application/ports/mailer';
import { Module } from '@nestjs/common';

import { LogMailer } from './log-mailer';

@Module({
  providers: [{ provide: Mailer, useClass: LogMailer }],
  exports: [Mailer],
})
export class MailModule {}
