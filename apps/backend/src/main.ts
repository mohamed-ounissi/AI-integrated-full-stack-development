import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // dev convenience: the frontend's port keeps shifting depending on whatever else
  // is running locally (3000, 3002, 5000, ...), so allow any localhost origin
  // instead of chasing one hardcoded port. Fine for local dev; not meant for prod.
  app.enableCors({ origin: process.env.FRONTEND_URL ?? /^http:\/\/localhost:\d+$/ });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
