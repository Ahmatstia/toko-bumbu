import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

import { ProductsModule } from '../products/products.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Customer, Transaction]),
    ProductsModule,
    TransactionsModule,
    InventoryModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
