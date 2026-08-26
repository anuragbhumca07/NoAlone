import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';

// A single uncaught rejection (e.g. a transient DB hiccup inside a detached
// setTimeout/socket callback, outside any request's try/catch) would
// otherwise take the entire process down. Log and keep serving everyone
// else instead — this has already caught real crashes in socket handlers.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (process kept alive):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (process kept alive):', err);
});

async function bootstrap() {
  // This repo is public. JWT signing, the Google OAuth client secret, and
  // the key used to encrypt stored Google Calendar tokens at rest all used
  // to silently fall back to a hardcoded value if the real env var was
  // ever unset — meaning that fallback, and how to exploit it, was sitting
  // in plain sight in the source for anyone to read. GOOGLE_TOKEN_ENCRYPTION_KEY
  // was actually missing in production when this was found: every stored
  // Google token was "encrypted" with a key visible in this repo, which is
  // no real protection at all if the database is ever read some other way.
  // Fail loudly at startup instead of silently running with a public secret.
  for (const name of ['JWT_SECRET', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_TOKEN_ENCRYPTION_KEY']) {
    if (!process.env[name]) {
      throw new Error(`${name} environment variable is required and must not be empty.`);
    }
  }

  const app = await NestFactory.create(AppModule);

  // Behind Railway's reverse proxy, req.ip would otherwise resolve to the
  // proxy's internal address for every request — trust X-Forwarded-For so
  // per-IP rate limiting (see ThrottlerModule below) actually works.
  // `true` (trust the whole chain, take the leftmost/original address) is
  // used instead of a fixed hop count of 1: Railway's edge routing doesn't
  // guarantee a constant number of proxy hops per request, and a fixed
  // count silently extracts the wrong address whenever it doesn't match,
  // making the same client land in a different rate-limit bucket per
  // request (confirmed in production — 12 requests from one client
  // produced 5+ different tracker keys under trust proxy: 1).
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS — FRONTEND_URL may be a comma-separated list (e.g. localhost and
  // 127.0.0.1 are different origins to the browser even on the same machine).
  // Falls back to known local-dev origins, never a bare '*': combined with
  // credentials: true, a wildcard origin is a real CORS footgun (most CORS
  // middleware reflects the request's actual Origin back in that case,
  // since a literal '*' with credentials is invalid per spec) — harmless
  // today only because nothing here uses cookies, but not worth relying on.
  const frontendUrls = process.env.FRONTEND_URL?.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: frontendUrls?.length ? frontendUrls : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('noAlone API')
    .setDescription('Social chat app API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`noAlone backend running on port ${port}`);
}
bootstrap().catch((err) => {
  // The unhandledRejection listener above is for transient runtime hiccups
  // and deliberately keeps the process alive — wrong for a fatal startup
  // config error, where the process would otherwise sit there "alive" but
  // never actually listening, failing Railway's healthcheck with no clear
  // reason why instead of exiting immediately with one.
  console.error('Fatal error during startup:', err.message);
  process.exit(1);
});
