import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export function configurarApp(app: INestApplication): void {
  app.use(cookieParser());
}
