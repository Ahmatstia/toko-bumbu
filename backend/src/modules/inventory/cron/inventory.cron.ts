import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from '../inventory.service';

@Injectable()
export class InventoryCron {
  private readonly logger = new Logger(InventoryCron.name);

  constructor(private readonly inventoryService: InventoryService) {}

  // Run every day at MN
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredStock() {
    this.logger.log('Starting automated expired stock processing...');
    try {
      const results = await this.inventoryService.checkExpiredProducts();
      this.logger.log(`Expired stock processing completed. Found ${results.processed} items.`);
    } catch (error) {
      this.logger.error('Failed to process expired stock automatically:', error);
    }
  }
}
