import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Transaction, TransactionStatus } from '../transactions/entities/transaction.entity';

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
    const [totalProducts, totalCustomers, totalTransactions, totalRevenue, pendingTransactions] =
      await Promise.all([
        this.productRepository.count(),
        this.customerRepository.count(),
        this.transactionRepository.count(),
        this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.total)', 'total')
          .where('transaction.status = :status', { status: TransactionStatus.COMPLETED })
          .getRawOne(),
        this.transactionRepository.count({
          where: { status: TransactionStatus.PENDING },
        }),
      ]);

    return {
      totalProducts,
      totalCustomers,
      totalTransactions,
      totalRevenue: totalRevenue?.total || 0,
      pendingTransactions,
    };
  }
}
