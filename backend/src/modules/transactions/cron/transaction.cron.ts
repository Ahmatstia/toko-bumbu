import { Injectable, Logger } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
import { TransactionsService } from '../transactions.service';

@Injectable()
export class TransactionCron {
  private readonly logger = new Logger(TransactionCron.name);

  constructor(private transactionsService: TransactionsService) {}

  // COMMENT DULU - Method belum ada
  // @Cron('0 1 * * *')
  // async handleExpiredTransactions() {
  //   this.logger.log('Menjalankan cron: auto-cancel expired transactions');
  //
  //   try {
  //     const result = await this.transactionsService.autoCancelExpiredTransactions();
  //     this.logger.log(`${result.processed} transaksi expired telah dibatalkan`);
  //   } catch (error) {
  //     this.logger.error('Gagal menjalankan cron:', error);
  //   }
  // }
}
