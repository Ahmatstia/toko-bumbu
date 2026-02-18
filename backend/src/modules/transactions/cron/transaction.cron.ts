import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InventoryService } from '../../inventory/inventory.service';

@Injectable()
export class TransactionCron {
  private readonly logger = new Logger(TransactionCron.name);

  constructor(private inventoryService: InventoryService) {}

  // Jalankan setiap jam 1 pagi
  @Cron('0 1 * * *')
  async handleExpiredStocks() {
    this.logger.log('Menjalankan cron: auto-cancel expired stocks');

    try {
      const result = await this.inventoryService.checkExpiredProducts();
      this.logger.log(`${result.processed} stok expired telah diproses`);
    } catch (error) {
      this.logger.error('Gagal menjalankan cron:', error);
    }
  }
}
