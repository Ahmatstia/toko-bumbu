import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransactionsService } from '../transactions.service';

@Injectable()
export class TransactionCron {
  private readonly logger = new Logger(TransactionCron.name);

  constructor(private transactionsService: TransactionsService) {}

  // Jalankan setiap jam 1 pagi
  @Cron('0 1 * * *')
  async handleExpiredReservations() {
    this.logger.log('Menjalankan cron: process expired reservations');

    try {
      const result = await this.transactionsService.processExpiredReservations();
      this.logger.log(`${result.processed} reservasi expired telah diproses`);
    } catch (error) {
      this.logger.error('Gagal menjalankan cron:', error);
    }
  }
}
