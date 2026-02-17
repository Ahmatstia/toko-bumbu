import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { seedUsers } from './user.seed';
import { User } from '../modules/users/entities/user.entity';

config();

async function runSeeds() {
  const configService = new ConfigService();

  const dataSource = new DataSource({
    type: 'mysql',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [User],
  });

  await dataSource.initialize();
  console.log('📦 Database connected');

  await seedUsers(dataSource);

  await dataSource.destroy();
  console.log('✨ Seeding completed');
}

runSeeds().catch(console.error);
