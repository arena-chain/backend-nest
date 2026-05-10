import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  // Same root as Multer (`./uploads/...`) and ServeStatic (`process.cwd()/uploads`).
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  const videosDir = join(uploadsDir, 'videos');
  if (!existsSync(videosDir)) {
    mkdirSync(videosDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Custom body parser with higher limit (e.g. for base64 logos or large JSON)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const httpServer = app.getHttpAdapter().getInstance();
  httpServer.get('/', (_req, res) => {
    res.status(200).json({
      service: 'arena-chain-api',
      status: 'ok',
      hint: 'Routes use the /api prefix. Try GET /api/health',
      links: {
        health: '/api/health',
        apiRoot: '/api',
        docs: '/docs',
      },
    });
  });

  app.use((req: express.Request, _res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  // Enable CORS for mobile apps
  app.enableCors({
    origin: true, // Allow all origins (mobile apps)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Arena Chain API')
    .setDescription('Arena Chain Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controllers!
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const publicBase =
    process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '') ||
    process.env.PUBLIC_URL?.replace(/\/$/, '');

  console.log(`\n🚀 Application is running!`);
  console.log(`📍 Listening on 0.0.0.0:${port}`);

  if (publicBase) {
    console.log(`🌐 Public URL (use this in browser / Postman): ${publicBase}`);
    console.log(`   Health: ${publicBase}/api/health`);
    console.log(`   Swagger: ${publicBase}/docs`);
    console.log(`   Root: ${publicBase}/`);
  } else {
    console.log(`📍 Local dev: http://localhost:${port}`);
    console.log(`📍 Root info: http://localhost:${port}/`);
    console.log(`📚 Swagger: http://localhost:${port}/docs`);
    console.log(`\n💡 On another device on LAN: http://<your-ip>:${port}`);
  }
  console.log('');
}
bootstrap();
