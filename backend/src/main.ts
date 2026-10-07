import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ObserveInstrument } from './observe.js';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.use(helmet());

  // FRONTEND_URL stays a single origin because PayHere's return/cancel URLs are
  // built from it. In development we additionally accept any localhost port,
  // since Vite moves to 5174+ whenever 5173 is already taken. Production keeps
  // the strict allowlist.
  const allowed = process.env.FRONTEND_URL;
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || origin === allowed) return callback(null, true);
      if (!isProd && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe ({ whitelist: true, forbidNonWhitelisted: true , transform: true}))
  
  await app.listen(process.env.PORT ?? 3000);
  
}
await bootstrap();
