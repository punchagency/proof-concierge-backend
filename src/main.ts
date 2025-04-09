import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType, ValidationPipe, BadRequestException } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Increase request size limit for large payloads (e.g., avatar uploads)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  // Enable CORS for client-side development
  app.enableCors({
    origin: true, // Allow all origins in development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
  });

  // Add global validation pipe with custom error handling
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { 
        enableImplicitConversion: true,
        exposeDefaultValues: true
      },
      whitelist: true,
      forbidNonWhitelisted: false,
      enableDebugMessages: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(error => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages
        });
      }
    }),
  );

  const port = process.env.PORT || 5005;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
