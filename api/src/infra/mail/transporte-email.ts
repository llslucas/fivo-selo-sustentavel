import { Mailer } from '@domain/fivo/application/ports/mailer';

/** Envio direto ao provedor; o `Mailer` da aplicação o envolve com a fila de reenvio. */
export abstract class TransporteEmail extends Mailer {}
