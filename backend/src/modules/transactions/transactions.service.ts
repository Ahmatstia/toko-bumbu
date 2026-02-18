import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm'; // <-- HAPUS MoreThan
import { Transaction, TransactionStatus, PaymentMethod } from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { Inventory, InventoryType } from '../inventory/entities/inventory.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private transactionItemRepository: Repository<TransactionItem>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    private dataSource: DataSource,
  ) {}

  // Generate nomor invoice
  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const dateStr = `${year}${month}${day}`;

    const lastTransaction = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.invoiceNumber LIKE :pattern', { pattern: `INV-${dateStr}-%` })
      .orderBy('transaction.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTransaction) {
      const lastSeq = parseInt(lastTransaction.invoiceNumber.split('-').pop() || '0');
      sequence = lastSeq + 1;
    }

    return `INV-${dateStr}-${String(sequence).padStart(4, '0')}`;
  }

  // Validasi stok (cek ketersediaan - tidak kurangi)
  private async validateStock(items: AddToCartDto[]): Promise<any[]> {
    console.log('Validating stock for items:', JSON.stringify(items, null, 2));

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
      console.log(`Checking product ID: ${item.productId}`);

      const product = await this.productRepository.findOne({
        where: { id: item.productId, isActive: true },
      });

      if (!product) {
        console.error(`Product not found: ${item.productId}`);
        throw new NotFoundException(`Product ${item.productId} tidak ditemukan`);
      }

      console.log(`Product found: ${product.name}`);

      // Hitung total reservasi aktif untuk produk ini
      const activeReservations = await this.reservationRepository
        .createQueryBuilder('reservation')
        .where('reservation.productId = :productId', { productId: item.productId })
        .andWhere('reservation.status = :status', { status: ReservationStatus.ACTIVE })
        .getMany();

      const reservedQuantity = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
      console.log(`Active reservations: ${reservedQuantity}`);

      // Cari stok yang available
      let stockQuery = this.stockRepository
        .createQueryBuilder('stock')
        .where('stock.productId = :productId', { productId: item.productId })
        .andWhere('stock.quantity > 0')
        .orderBy('stock.expiryDate', 'ASC')
        .addOrderBy('stock.createdAt', 'ASC');

      if (item.stockId) {
        stockQuery = stockQuery.andWhere('stock.id = :stockId', { stockId: item.stockId });
      }

      const allStocks = await stockQuery.getMany();
      console.log(`Total stocks found: ${allStocks.length}`);

      // Filter stok yang benar-benar tersedia (setelah dikurangi reservasi)
      const availableStocks = allStocks.filter((stock) => {
        const stockReserved = activeReservations
          .filter((r) => r.stockId === stock.id)
          .reduce((sum, r) => sum + r.quantity, 0);
        return stock.quantity - stockReserved > 0;
      });

      console.log(`Available stocks after reservation: ${availableStocks.length}`);

      if (availableStocks.length === 0) {
        throw new BadRequestException(`Stok ${product.name} habis`);
      }

      let remainingQty = item.quantity;
      const stockAllocations: StockAllocation[] = [];

      for (const stock of availableStocks) {
        if (remainingQty <= 0) break;

        const stockReserved = activeReservations
          .filter((r) => r.stockId === stock.id)
          .reduce((sum, r) => sum + r.quantity, 0);

        const availableQty = stock.quantity - stockReserved;
        const takeQty = Math.min(remainingQty, availableQty);

        if (takeQty > 0) {
          stockAllocations.push({
            stock,
            quantity: takeQty,
          });
          remainingQty -= takeQty;
          console.log(`  - Taking ${takeQty} from stock ${stock.id}, remaining: ${remainingQty}`);
        }
      }

      if (remainingQty > 0) {
        throw new BadRequestException(
          `Stok ${product.name} tidak cukup. Tersedia: ${item.quantity - remainingQty}`,
        );
      }

      const price = stockAllocations[0]?.stock.sellingPrice || 0;
      console.log(`Price for ${product.name}: ${price}`);

      validatedItems.push({
        product,
        allocations: stockAllocations,
        quantity: item.quantity,
        price: Number(price),
      });
    }

    console.log(`Validation complete, ${validatedItems.length} items validated`);
    return validatedItems;
  }

  // Buat reservasi stok (HOLD)
  private async createReservations(
    transactionId: string,
    validatedItems: any[],
    expiresInHours: number = 24,
  ) {
    console.log(`Creating reservations for transaction: ${transactionId}`);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    console.log(`Reservations expire at: ${expiresAt.toISOString()}`);

    // PERBAIKAN: Deklarasikan tipe array
    const reservations: Reservation[] = [];

    for (const item of validatedItems) {
      console.log(`Creating reservations for product: ${item.product.name}`);

      for (const allocation of item.allocations) {
        console.log(`  - Reserving ${allocation.quantity} from stock ${allocation.stock.id}`);

        const reservation = new Reservation();
        reservation.transactionId = transactionId;
        reservation.productId = item.product.id;
        reservation.stockId = allocation.stock.id;
        reservation.quantity = allocation.quantity;
        reservation.expiresAt = expiresAt;
        reservation.status = ReservationStatus.ACTIVE;

        const saved = await this.reservationRepository.save(reservation);
        reservations.push(saved); // <-- SEKARANG AMAN
        console.log(`    ✅ Reservation created with ID: ${saved.id}`);
      }
    }

    console.log(`Total reservations created: ${reservations.length}`);
    return reservations;
  }

  // Buat transaksi baru (HANYA RESERVASI, TIDAK KURANGI STOK)
  async create(createTransactionDto: CreateTransactionDto, userId?: string) {
    console.log('=== CREATE TRANSACTION START ===');
    console.log('DTO:', JSON.stringify(createTransactionDto, null, 2));

    try {
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

      if (!items || items.length === 0) {
        throw new BadRequestException('Items tidak boleh kosong');
      }

      console.log('Validating stock for items:', items.length);
      const validatedItems = await this.validateStock(items);
      console.log('Stock validation passed, items:', validatedItems.length);

      const subtotal = validatedItems.reduce((sum, item) => {
        return sum + item.price * item.quantity;
      }, 0);
      console.log('Subtotal:', subtotal);

      const total = subtotal - discount;
      console.log('Total:', total);

      // Untuk CASH, validasi pembayaran harus pas
      if (paymentMethod === PaymentMethod.CASH && paymentAmount < total) {
        throw new BadRequestException(
          `Pembayaran kurang: Rp ${(total - paymentAmount).toLocaleString()}`,
        );
      }

      const changeAmount = paymentMethod === PaymentMethod.CASH ? paymentAmount - total : 0;
      const invoiceNumber = await this.generateInvoiceNumber();
      console.log('Invoice number:', invoiceNumber);

      // Set expiry 24 jam dari sekarang untuk non-CASH
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const transaction = new Transaction();
        transaction.invoiceNumber = invoiceNumber;
        transaction.userId = userId || null;
        transaction.customerName = customerName || 'Guest';
        transaction.customerPhone = customerPhone || '-';
        transaction.isGuest = isGuest !== false;
        transaction.customerId = customerId || null;
        transaction.subtotal = subtotal;
        transaction.discount = discount;
        transaction.total = total;
        transaction.paymentMethod = paymentMethod;
        transaction.paymentAmount = paymentMethod === PaymentMethod.CASH ? paymentAmount : total;
        transaction.changeAmount = changeAmount;
        transaction.status = TransactionStatus.PENDING;
        transaction.notes = notes || null;
        transaction.expiresAt = paymentMethod === PaymentMethod.CASH ? null : expiresAt;

        console.log('Saving transaction...');
        const savedTransaction = await queryRunner.manager.save(transaction);
        console.log('Transaction saved with ID:', savedTransaction.id);

        // Buat item transaksi (tanpa kurangi stok)
        console.log('Creating transaction items...');
        for (const item of validatedItems) {
          for (const allocation of item.allocations) {
            const transactionItem = new TransactionItem();
            transactionItem.transactionId = savedTransaction.id;
            transactionItem.productId = item.product.id;
            transactionItem.stockId = allocation.stock.id;
            transactionItem.quantity = allocation.quantity;
            transactionItem.price = item.price;
            transactionItem.subtotal = item.price * allocation.quantity;

            await queryRunner.manager.save(transactionItem);
            console.log(`  - Item: ${item.product.name} x ${allocation.quantity}`);
          }
        }

        // Buat RESERVASI (HOLD STOK)
        console.log('Creating reservations...');
        await this.createReservations(savedTransaction.id, validatedItems);

        await queryRunner.commitTransaction();
        console.log('Transaction committed successfully');

        const result = await this.findOne(savedTransaction.id);
        console.log('=== CREATE TRANSACTION SUCCESS ===');
        return result;
      } catch (error) {
        console.error('Transaction error, rolling back:', error);
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      console.error('=== CREATE TRANSACTION ERROR ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // KONFIRMASI PEMBAYARAN (Kurangi stok)
  async confirmPayment(transactionId: string, adminId: string) {
    const transaction = await this.findOne(transactionId);

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Transaksi tidak dalam status PENDING');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Ambil semua reservasi aktif
      const reservations = await this.reservationRepository.find({
        where: {
          transactionId,
          status: ReservationStatus.ACTIVE,
        },
        relations: ['stock', 'product'],
      });

      if (reservations.length === 0) {
        throw new BadRequestException('Tidak ada reservasi untuk transaksi ini');
      }

      // Kurangi stok dan catat history
      for (const res of reservations) {
        // Kurangi stok
        await queryRunner.manager
          .createQueryBuilder()
          .update(Stock)
          .set({
            quantity: () => `quantity - ${res.quantity}`,
          })
          .where('id = :id', { id: res.stockId })
          .execute();

        // Catat history inventory
        const inventory = new Inventory();
        inventory.productId = res.productId;
        inventory.type = InventoryType.OUT;
        inventory.quantity = -res.quantity;
        inventory.stockBefore = res.stock.quantity;
        inventory.stockAfter = res.stock.quantity - res.quantity;
        inventory.batchCode = res.stock.batchCode;
        inventory.notes = `Transaksi ${transaction.invoiceNumber}`;
        inventory.referenceId = transactionId;
        inventory.userId = adminId;

        await queryRunner.manager.save(inventory);

        // Update status reservasi
        res.status = ReservationStatus.CONFIRMED;
        res.confirmedAt = new Date();
        await queryRunner.manager.save(res);
      }

      // Update status transaksi
      transaction.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        message: 'Pembayaran dikonfirmasi, stok berhasil dikurangi',
        transaction,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // BATALKAN TRANSAKSI (Stok kembali)
  async cancelTransaction(transactionId: string, reason: string) {
    const transaction = await this.findOne(transactionId);

    if (![TransactionStatus.PENDING, TransactionStatus.PROCESSING].includes(transaction.status)) {
      throw new BadRequestException('Transaksi tidak dapat dibatalkan');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update status reservasi
      await queryRunner.manager
        .createQueryBuilder()
        .update(Reservation)
        .set({ status: ReservationStatus.CANCELLED })
        .where('transactionId = :transactionId', { transactionId })
        .andWhere('status = :status', { status: ReservationStatus.ACTIVE })
        .execute();

      // Update status transaksi
      transaction.status = TransactionStatus.CANCELLED;
      transaction.notes = transaction.notes
        ? `CANCELLED: ${reason} | ${transaction.notes}`
        : `CANCELLED: ${reason}`;

      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        message: 'Transaksi dibatalkan, stok tersedia kembali',
        transaction,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // PROSES RESERVASI EXPIRED (Cron job)
  async processExpiredReservations() {
    const now = new Date();

    const expiredReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.transaction', 'transaction')
      .where('reservation.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('reservation.expiresAt < :now', { now })
      .getMany();

    const transactionIds = [...new Set(expiredReservations.map((r) => r.transactionId))];

    for (const transactionId of transactionIds) {
      await this.reservationRepository
        .createQueryBuilder()
        .update(Reservation)
        .set({ status: ReservationStatus.EXPIRED })
        .where('transactionId = :transactionId', { transactionId })
        .andWhere('status = :status', { status: ReservationStatus.ACTIVE })
        .execute();

      await this.transactionRepository
        .createQueryBuilder()
        .update(Transaction)
        .set({ status: TransactionStatus.EXPIRED })
        .where('id = :id', { id: transactionId })
        .execute();
    }

    return {
      processed: expiredReservations.length,
      transactions: transactionIds.length,
    };
  }

  // CEK KETERSEDIAAN STOK (termasuk reservasi)
  async checkAvailability(productId: string) {
    const stocks = await this.stockRepository
      .createQueryBuilder('stock')
      .where('stock.productId = :productId', { productId })
      .andWhere('stock.quantity > 0')
      .orderBy('stock.expiryDate', 'ASC')
      .getMany();

    const activeReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.productId = :productId', { productId })
      .andWhere('reservation.status = :status', { status: ReservationStatus.ACTIVE })
      .getMany();

    const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const totalReserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);

    return {
      productId,
      totalStock,
      totalReserved,
      availableStock: totalStock - totalReserved,
      stocks: stocks.map((s) => {
        const reserved = activeReservations
          .filter((r) => r.stockId === s.id)
          .reduce((sum, r) => sum + r.quantity, 0);

        return {
          id: s.id,
          batchCode: s.batchCode,
          quantity: s.quantity,
          expiryDate: s.expiryDate,
          sellingPrice: s.sellingPrice,
          reserved,
          available: s.quantity - reserved,
        };
      }),
    };
  }

  // Update status transaksi (via admin)
  async updateStatus(id: string, status: TransactionStatus) {
    const transaction = await this.findOne(id);
    transaction.status = status;
    return this.transactionRepository.save(transaction);
  }

  // Cari transaksi berdasarkan ID
  async findOne(id: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'user', 'reservations'],
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
      relations: ['items', 'items.product', 'user', 'reservations'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return transaction;
  }

  // Dapatkan semua transaksi
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
      query.andWhere('transaction.paymentMethod = :paymentMethod', { paymentMethod });
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

  // Dapatkan transaksi customer
  async findByCustomer(customerId: string) {
    const transactions = await this.transactionRepository.find({
      where: { customerId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    return transactions;
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
      .where('transaction.createdAt BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();

    return {
      date: new Date().toISOString().split('T')[0],
      totalTransactions: parseInt(result.count) || 0,
      totalSales: parseFloat(result.total) || 0,
      totalPayment: parseFloat(result.payment) || 0,
      averageTransaction: parseFloat(result.average) || 0,
    };
  }
}

// Helper untuk MoreThan
const MoreThan = (value: number) => ({ _type: 'moreThan', _value: value });
