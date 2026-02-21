import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from '../inventory.service';

@Injectable()
export class InventoryCron implements OnModuleInit {
  private readonly logger = new Logger(InventoryCron.name);

  constructor(private readonly inventoryService: InventoryService) {}

  // Jalankan saat server start untuk langsung memproses stok yang sudah expired
  async onModuleInit() {
    this.logger.log('🚀 [Startup] Memeriksa stok expired...');
    try {
      const results = await this.inventoryService.checkExpiredProducts();
      if (results.processed > 0) {
        this.logger.log(`✅ [Startup] ${results.processed} stok expired telah diproses.`);
      } else {
        this.logger.log(`✅ [Startup] Tidak ada stok expired yang perlu diproses.`);
      }
    } catch (error) {
      this.logger.error('❌ [Startup] Gagal memproses stok expired:', error);
    }
  }

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredStock() {
    this.logger.log('🕛 [Cron] Starting automated expired stock processing...');
    try {
      const results = await this.inventoryService.checkExpiredProducts();
      this.logger.log(`✅ [Cron] Expired stock processing completed. Found ${results.processed} items.`);
    } catch (error) {
      this.logger.error('❌ [Cron] Failed to process expired stock automatically:', error);
    }
  }
}
