import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './http/configurar-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  await app.listen(process.env.PORT ?? 3000);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
