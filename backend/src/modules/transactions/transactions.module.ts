import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionItem, Product, Stock]),
    InventoryModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService], // HAPUS QRCodeService
  exports: [TransactionsService],
})
export class TransactionsModule {}
