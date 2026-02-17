import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Inventory } from './entities/inventory.entity';
import { Stock } from './entities/stock.entity';
import { Product } from '../products/entities/product.entity';
import { UsersModule } from '../users/users.module'; // Import UsersModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, Stock, Product]),
    UsersModule, // Biar bisa akses User entity
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
