import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS bawaan NestJS
    app.enableCors({
      origin: 'http://localhost:3000',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    await app.listen(3001);
    console.log(`🚀 Backend running on http://localhost:3001`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle promise dengan .catch()
bootstrap().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
