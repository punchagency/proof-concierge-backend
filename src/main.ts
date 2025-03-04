import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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


  const port = process.env.PORT || 5005;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
