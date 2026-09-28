import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('PORT') ?? 4000;
  const frontendUrl =
    config.get<string>('FRONTEND_URL') ?? 'http://localhost:4001';

  // Sécurité HTTP
  app.use(helmet());

  // Cookies sécurisés pour l'authentification future
  app.use(cookieParser());

  // Préfixe global de l'API
  app.setGlobalPrefix('api/v1');

  // Validation stricte des DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Autoriser uniquement le frontend FifiShop
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  // Swagger uniquement hors production
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FifiShop API')
      .setDescription('API REST de la plateforme e-commerce FifiShop')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port, '127.0.0.1');

  console.log(`FifiShop API : http://localhost:${port}/api/v1`);
  console.log(`Health       : http://localhost:${port}/api/v1/health`);

  if (config.get<string>('NODE_ENV') !== 'production') {
    console.log(`Swagger      : http://localhost:${port}/api/docs`);
  }
}

bootstrap();
