import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Modules
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AdminModule } from './modules/admin/admin.module';

// Entities (untuk TypeORM)
import { User } from './modules/users/entities/user.entity';
import { Category } from './modules/categories/entities/category.entity';
import { Product } from './modules/products/entities/product.entity';
import { ProductImage } from './modules/products/entities/product-image.entity';
import { Stock } from './modules/inventory/entities/stock.entity';
import { Inventory } from './modules/inventory/entities/inventory.entity';
import { Transaction } from './modules/transactions/entities/transaction.entity';
import { TransactionItem } from './modules/transactions/entities/transaction-item.entity';
import { Reservation } from './modules/transactions/entities/reservation.entity';
import { Customer } from './modules/customers/entities/customer.entity';
import { CustomerAddress } from './modules/customers/entities/customer-address.entity';

// Cron Jobs
import { TransactionCron } from './modules/transactions/cron/transaction.cron';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_DATABASE', 'bumbuku_db'),
        entities: [
          User,
          Category,
          Product,
          ProductImage,
          Stock,
          Inventory,
          Transaction,
          TransactionItem,
          Reservation, // <-- PASTIKAN INI ADA
          Customer,
          CustomerAddress,
        ],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
        timezone: '+07:00',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    TransactionsModule,
    CustomersModule,
    AdminModule,
  ],
  providers: [TransactionCron],
})
export class AppModule {}
