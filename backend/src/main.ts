import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder } from '@nestjs/swagger/dist/document-builder';
import { SwaggerModule } from '@nestjs/swagger/dist/swagger-module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('InternHelp API')
    .setDescription('API for InternHelp application')
    .setVersion('1.0')
    .addTag('internhelp')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      console.error('Validation Errors:', JSON.stringify(errors, null, 2));
      return new BadRequestException(errors);
    },
  }))

  // CORS: jeden middleware, jawne originy (wymagane przy credentials: true)
  const allowedOrigins = [
    'http://localhost:4200', // Angular dev server
    'http://127.0.0.1:4200',
    'http://localhost', // frontend z Dockera (nginx :80)
    'http://127.0.0.1',
    'http://localhost:3000',
    'https://carriersign-app.thankfulrock-d61f60a3.switzerlandnorth.azurecontainerapps.io', //backend
    'https://carriersign-web.thankfulrock-d61f60a3.switzerlandnorth.azurecontainerapps.io', //frontend
    'https://api.carriersign.batko.it',
    'https://carriersign.batko.it'

  ];

  app.enableCors({
    origin: (origin, callback) => {
      // pozwól też na requesty bez Origin (np. curl/postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
