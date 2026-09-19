import { Mailer } from '@domain/fivo/application/ports/mailer';
import { Module } from '@nestjs/common';

import { EmailPendenteService } from './email-pendente.service';
import { EmailPendenteWorker } from './email-pendente.worker';
import { LogMailer } from './log-mailer';
import { MailerResiliente } from './mailer-resiliente';
import { TransporteEmail } from './transporte-email';

@Module({
  providers: [
    { provide: TransporteEmail, useClass: LogMailer },
    EmailPendenteService,
    EmailPendenteWorker,
    { provide: Mailer, useClass: MailerResiliente },
  ],
  exports: [Mailer],
})
export class MailModule {}
