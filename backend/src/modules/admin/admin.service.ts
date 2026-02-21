import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Transaction, TransactionStatus } from '../transactions/entities/transaction.entity';

import { ProductsService } from '../products/products.service';
import { TransactionsService } from '../transactions/transactions.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private productsService: ProductsService,
    private transactionsService: TransactionsService,
    private inventoryService: InventoryService,
  ) {}

  async getSummary(startDate?: Date, endDate?: Date) {
    const revenueQuery = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.total)', 'total')
      .addSelect('COUNT(transaction.id)', 'count')
      .addSelect('AVG(transaction.total)', 'average')
      .where('transaction.status = :status', { status: TransactionStatus.COMPLETED });

    const customerQuery = this.customerRepository.createQueryBuilder('customer');
    const transactionCountQuery = this.transactionRepository.createQueryBuilder('transaction');

    if (startDate) {
      revenueQuery.andWhere('transaction.createdAt >= :startDate', { startDate });
      customerQuery.andWhere('customer.createdAt >= :startDate', { startDate });
      transactionCountQuery.andWhere('transaction.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      revenueQuery.andWhere('transaction.createdAt <= :endDate', { endDate: end });
      customerQuery.andWhere('customer.createdAt <= :endDate', { endDate: end });
      transactionCountQuery.andWhere('transaction.createdAt <= :endDate', { endDate: end });
    }

    const [totalProducts, totalCustomers, totalTransactions, revenueResult, pendingTransactions] =
      await Promise.all([
        this.productRepository.count(),
        customerQuery.getCount(),
        transactionCountQuery.getCount(),
        revenueQuery.getRawOne<{ total: string | null; count: string; average: string }>(),
        this.transactionRepository.count({
          where: { status: TransactionStatus.PENDING },
        }),
      ]);

    const totalSales = revenueResult?.total ? parseFloat(revenueResult.total) : 0;
    const totalCompletedTransactions = revenueResult?.count ? parseInt(revenueResult.count) : 0;
    const averageTransaction = revenueResult?.average ? parseFloat(revenueResult.average) : 0;

    return {
      totalProducts,
      totalCustomers,
      totalTransactions, // Ini total semua transaksi dalam range (atau semua jika tidak ada range)
      totalSales, // Ini TOTAL RUPIAH (sebelumnya totalRevenue)
      totalCompletedTransactions,
      averageTransaction,
      pendingTransactions,
    };
  }

  async getDashboardStats() {
    const [
      summary,
      todaySales,
      weeklySales,
      monthlySales,
      topProducts,
      lowStock,
      expiringSoon,
      recentTransactions,
      paymentMethods,
    ] = await Promise.all([
      this.getSummary(),
      this.transactionsService.getTodaySales(),
      this.transactionsService.getWeeklySales(),
      this.transactionsService.getMonthlySales(),
      this.productsService.getTopProducts(5),
      this.inventoryService.getLowStock(5),
      this.inventoryService.getExpiringSoon(30),
      this.transactionRepository.find({
        take: 7,
        order: { createdAt: 'DESC' },
        relations: ['customer'],
      }),
      this.transactionsService.getPaymentMethods(),
    ]);

    return {
      summary,
      todaySales,
      weeklySales,
      monthlySales,
      topProducts,
      lowStock,
      expiringSoon,
      recentTransactions: recentTransactions.map((trx) => ({
        id: trx.id,
        invoiceNumber: trx.invoiceNumber,
        customerName: trx.customerName || trx.customer?.name || 'Guest',
        total: trx.total,
        status: trx.status,
        paymentMethod: trx.paymentMethod,
        createdAt: trx.createdAt,
      })),
      paymentMethods,
    };
  }
}
