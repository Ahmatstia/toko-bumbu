import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Reservation } from './entities/reservation.entity';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionItem,
      Reservation,
      Product,
      Stock,
      Inventory,
      Customer,
    ]),
    InventoryModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
