import { Mailer } from '@domain/fivo/shared/ports/mailer';
import { Module } from '@nestjs/common';

import { EmailPendenteService } from './email-pendente.service';
import { EmailPendenteWorker } from './email-pendente.worker';
import { escolherTransporteEmail } from './escolher-transporte-email';
import { MailerResiliente } from './mailer-resiliente';
import { TransporteEmail } from './transporte-email';

@Module({
  providers: [
    { provide: TransporteEmail, useFactory: () => escolherTransporteEmail() },
    EmailPendenteService,
    EmailPendenteWorker,
    { provide: Mailer, useClass: MailerResiliente },
  ],
  exports: [Mailer],
})
export class MailModule {}
