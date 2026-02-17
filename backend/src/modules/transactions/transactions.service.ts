import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction, TransactionStatus, PaymentMethod } from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryType } from '../inventory/entities/inventory.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private transactionItemRepository: Repository<TransactionItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    private inventoryService: InventoryService,
    private dataSource: DataSource,
  ) {}

  // Generate nomor invoice
  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const dateStr = `${year}${month}${day}`;

    // Cari transaksi terakhir hari ini
    const lastTransaction = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.invoiceNumber LIKE :pattern', {
        pattern: `INV-${dateStr}-%`,
      })
      .orderBy('transaction.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTransaction) {
      const lastSeq = parseInt(lastTransaction.invoiceNumber.split('-').pop() || '0');
      sequence = lastSeq + 1;
    }

    return `INV-${dateStr}-${String(sequence).padStart(4, '0')}`;
  }

  // Validasi stok sebelum transaksi
  private async validateStock(items: AddToCartDto[]): Promise<any[]> {
    // Definisikan type
    type StockAllocation = {
      stock: Stock;
      quantity: number;
    };

    type ValidatedItem = {
      product: Product;
      allocations: StockAllocation[];
      quantity: number;
      price: number;
    };

    const validatedItems: ValidatedItem[] = [];

    for (const item of items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, isActive: true },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} tidak ditemukan`);
      }

      // Cari stok yang available (FIFO: yang expired duluan)
      let stockQuery = this.stockRepository
        .createQueryBuilder('stock')
        .where('stock.productId = :productId', { productId: item.productId })
        .andWhere('stock.quantity > 0')
        .orderBy('stock.expiryDate', 'ASC')
        .addOrderBy('stock.createdAt', 'ASC');

      if (item.stockId) {
        stockQuery = stockQuery.andWhere('stock.id = :stockId', {
          stockId: item.stockId,
        });
      }

      const availableStocks = await stockQuery.getMany();

      if (availableStocks.length === 0) {
        throw new BadRequestException(`Stok ${product.name} habis`);
      }

      let remainingQty = item.quantity;
      const stockAllocations: StockAllocation[] = [];

      for (const stock of availableStocks) {
        if (remainingQty <= 0) break;

        const takeQty = Math.min(remainingQty, stock.quantity);
        stockAllocations.push({
          stock,
          quantity: takeQty,
        });
        remainingQty -= takeQty;
      }

      if (remainingQty > 0) {
        throw new BadRequestException(
          `Stok ${product.name} tidak cukup. Tersedia: ${item.quantity - remainingQty}`,
        );
      }

      // Ambil harga jual dari stock pertama
      const price = stockAllocations[0]?.stock.sellingPrice || 0;

      validatedItems.push({
        product,
        allocations: stockAllocations,
        quantity: item.quantity,
        price: Number(price),
      });
    }

    return validatedItems;
  }

  // Buat transaksi baru
  async create(createTransactionDto: CreateTransactionDto, userId?: string) {
    const {
      items,
      customerName,
      customerPhone,
      isGuest,
      customerId,
      paymentMethod,
      paymentAmount,
      discount = 0,
      notes,
    } = createTransactionDto;

    // Validasi items
    if (!items || items.length === 0) {
      throw new BadRequestException('Items tidak boleh kosong');
    }

    // Validasi stok
    const validatedItems = await this.validateStock(items);

    // Hitung subtotal
    const subtotal = validatedItems.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const total = subtotal - discount;

    // Validasi pembayaran
    if (paymentAmount < total) {
      throw new BadRequestException(
        `Pembayaran kurang: Rp ${(total - paymentAmount).toLocaleString()}`,
      );
    }

    const changeAmount = paymentAmount - total;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Gunakan transaction database
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Buat transaksi header
      const transaction = new Transaction();
      transaction.invoiceNumber = invoiceNumber;
      transaction.userId = userId || null;
      transaction.customerName = customerName || 'Guest';
      transaction.customerPhone = customerPhone || '-';
      transaction.isGuest = isGuest !== false;
      transaction.customerId = customerId || null; // <-- PASTIKAN INI
      transaction.subtotal = subtotal;
      transaction.discount = discount;
      transaction.total = total;
      transaction.paymentMethod = paymentMethod;
      transaction.paymentAmount = paymentAmount;
      transaction.changeAmount = changeAmount;
      transaction.status = TransactionStatus.COMPLETED;
      transaction.notes = notes || null;

      const savedTransaction = await queryRunner.manager.save(transaction);

      // 2. Buat item transaksi dan kurangi stok
      for (const item of validatedItems) {
        for (const allocation of item.allocations) {
          // Buat transaction item
          const transactionItem = new TransactionItem();
          transactionItem.transactionId = savedTransaction.id;
          transactionItem.productId = item.product.id;
          transactionItem.stockId = allocation.stock.id;
          transactionItem.quantity = allocation.quantity;
          transactionItem.price = item.price;
          transactionItem.subtotal = item.price * allocation.quantity;

          await queryRunner.manager.save(transactionItem);

          // Update stok langsung
          await queryRunner.manager
            .createQueryBuilder()
            .update(Stock)
            .set({
              quantity: () => `quantity - ${allocation.quantity}`,
            })
            .where('id = :id', { id: allocation.stock.id })
            .execute();
        }
      }

      await queryRunner.commitTransaction();

      // Catat ke inventory service di background
      this.recordInventoryLog(validatedItems, invoiceNumber, savedTransaction.id).catch(
        console.error,
      );

      return this.findOne(savedTransaction.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Method terpisah untuk catat inventory (biar ga blocking)
  private async recordInventoryLog(
    validatedItems: any[],
    invoiceNumber: string,
    transactionId: string,
  ) {
    try {
      for (const item of validatedItems) {
        for (const allocation of item.allocations) {
          await this.inventoryService.addStock({
            productId: item.product.id,
            type: InventoryType.OUT,
            quantity: allocation.quantity,
            batchCode: allocation.stock.batchCode || undefined,
            notes: `Transaksi ${invoiceNumber}`,
            referenceId: transactionId,
          });
        }
      }
    } catch (error) {
      console.error('Gagal catat inventory log:', error);
    }
  }

  // Cari transaksi berdasarkan ID
  async findOne(id: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return transaction;
  }

  // Cari berdasarkan invoice number
  async findByInvoice(invoiceNumber: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { invoiceNumber },
      relations: ['items', 'items.product', 'user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return transaction;
  }

  // Dapatkan semua transaksi (dengan filter)
  async findAll(
    startDate?: Date,
    endDate?: Date,
    status?: TransactionStatus,
    paymentMethod?: PaymentMethod,
    search?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (startDate) {
      query.andWhere('transaction.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    if (status) {
      query.andWhere('transaction.status = :status', { status });
    }

    if (paymentMethod) {
      query.andWhere('transaction.paymentMethod = :paymentMethod', {
        paymentMethod,
      });
    }

    if (search) {
      query.andWhere(
        '(transaction.invoiceNumber LIKE :search OR transaction.customerName LIKE :search OR transaction.customerPhone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Hitung total penjualan hari ini
  async getTodaySales() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(transaction.id)', 'count')
      .addSelect('SUM(transaction.total)', 'total')
      .addSelect('SUM(transaction.paymentAmount)', 'payment')
      .addSelect('AVG(transaction.total)', 'average')
      .where('transaction.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      })
      .getRawOne();

    return {
      date: new Date().toISOString().split('T')[0],
      totalTransactions: parseInt(result.count) || 0,
      totalSales: parseFloat(result.total) || 0,
      totalPayment: parseFloat(result.payment) || 0,
      averageTransaction: parseFloat(result.average) || 0,
    };
  }

  async findByCustomer(customerId: string) {
    const transactions = await this.transactionRepository.find({
      where: { customerId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    return transactions;
  }

  // Batalkan transaksi (refund)
  async cancel(id: string, reason: string) {
    const transaction = await this.findOne(id);

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Hanya transaksi COMPLETED yang bisa dibatalkan');
    }

    // Gunakan transaction database
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update status transaksi
      transaction.status = TransactionStatus.CANCELLED;
      transaction.notes = transaction.notes
        ? `CANCELLED: ${reason} | ${transaction.notes}`
        : `CANCELLED: ${reason}`;

      await queryRunner.manager.save(transaction);

      // Kembalikan stok (via inventory service)
      for (const item of transaction.items) {
        await this.inventoryService.addStock({
          productId: item.productId,
          type: InventoryType.RETURN,
          quantity: item.quantity,
          batchCode: item.stock?.batchCode || undefined,
          notes: `Return dari transaksi ${transaction.invoiceNumber}`,
          referenceId: transaction.id,
        });
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Transaksi berhasil dibatalkan',
        transaction,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
