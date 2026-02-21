import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Transaction, TransactionStatus } from '../transactions/entities/transaction.entity';

interface RevenueResult {
  total: string | null;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async getSummary() {
    const [totalProducts, totalCustomers, totalTransactions, revenueResult, pendingTransactions] =
      await Promise.all([
        this.productRepository.count(),
        this.customerRepository.count(),
        this.transactionRepository.count(),
        this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.total)', 'total')
          .where('transaction.status = :status', { status: TransactionStatus.COMPLETED })
          .getRawOne<RevenueResult>(),
        this.transactionRepository.count({
          where: { status: TransactionStatus.PENDING },
        }),
      ]);

    return {
      totalProducts,
      totalCustomers,
      totalTransactions,
      totalRevenue: revenueResult?.total ? parseFloat(revenueResult.total) : 0,
      pendingTransactions,
    };
  }
}
