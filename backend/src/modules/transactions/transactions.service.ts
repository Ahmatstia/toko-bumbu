import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
  OrderType,
} from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Product } from '../products/entities/product.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { v4 as uuidv4 } from 'uuid';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { subDays } from 'date-fns';
import { Customer } from '../customers/entities/customer.entity';

// Interface untuk alokasi stok
interface StockAllocation {
  stock: Stock;
  quantity: number;
}

// Interface untuk item yang sudah divalidasi
interface ValidatedItem {
  product: Product;
  allocations: StockAllocation[];
  quantity: number;
  price: number;
}

// Interface untuk hasil query statistik mingguan/bulanan
interface MonthlySalesResult {
  date: string;
  total: string;
}

// Interface untuk hasil query transaksi (raw)
interface RawTransaction {
  id: string;
  invoice_number: string;
  status: TransactionStatus;
  customer_id?: string;
  total: string | number;
}

// Interface untuk hasil query reservasi (raw)
interface RawReservation {
  id: string;
  stock_id: string;
  product_id: string;
  quantity: number;
  status: string;
  stock_quantity: number;
  batch_code: string;
  expiry_date: Date;
  purchase_price: number;
  selling_price: number;
  product_name: string;
}

// Interface untuk hasil query mysql affectedRows
interface MySqlResult {
  affectedRows?: number;
  insertId?: number;
  [key: number]: any; // Untuk menangani format array [ { affectedRows: ... }, ... ]
}

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
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
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
  private async validateStock(
    items: AddToCartDto[],
    manager?: EntityManager,
  ): Promise<ValidatedItem[]> {
    console.log('Validating stock for items:', JSON.stringify(items, null, 2));

    const validatedItems: ValidatedItem[] = [];

    for (const item of items) {
      console.log(`Checking product ID: ${item.productId}`);

      const productRepo = manager ? manager.getRepository(Product) : this.productRepository;
      const product = await productRepo.findOne({
        where: { id: item.productId, isActive: true },
      });

      if (!product) {
        console.error(`Product not found: ${item.productId}`);
        throw new NotFoundException(`Product ${item.productId} tidak ditemukan`);
      }

      console.log(`Product found: ${product.name}`);

      // Hitung total reservasi aktif untuk produk ini
      const reservationRepo = manager
        ? manager.getRepository(Reservation)
        : this.reservationRepository;

      const activeReservations = await reservationRepo
        .createQueryBuilder('reservation')
        .where('reservation.productId = :productId', { productId: item.productId })
        .andWhere('reservation.status = :status', { status: ReservationStatus.ACTIVE })
        .getMany();

      const reservedQuantity = activeReservations.reduce((sum, r) => sum + r.quantity, 0);
      console.log(`Active reservations: ${reservedQuantity}`);

      // Cari stok yang available
      const stockRepo = manager ? manager.getRepository(Stock) : this.stockRepository;
      let stockQuery = stockRepo
        .createQueryBuilder('stock')
        .where('stock.productId = :productId', { productId: item.productId })
        .andWhere('stock.quantity > 0')
        .andWhere('(stock.expiryDate IS NULL OR stock.expiryDate > CURRENT_DATE())') // Filter expired
        .orderBy('stock.expiryDate', 'ASC')
        .addOrderBy('stock.createdAt', 'ASC');

      // PENTING: Gunakan locking jika di dalam transaction
      if (manager) {
        stockQuery = stockQuery.setLock('pessimistic_write');
      }

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
    validatedItems: ValidatedItem[],
    manager?: EntityManager,
    expiresInHours: number = 24,
  ) {
    console.log(`Creating reservations for transaction: ${transactionId}`);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    console.log(`Reservations expire at: ${expiresAt.toISOString()}`);

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

        const reservationRepo = manager
          ? manager.getRepository(Reservation)
          : this.reservationRepository;
        const saved = await reservationRepo.save(reservation);
        reservations.push(saved);
        console.log(`    ✅ Reservation created with ID: ${saved.id}`);
      }
    }

    console.log(`Total reservations created: ${reservations.length}`);
    return reservations;
  }

  async getWeeklySales() {
    const endDate = new Date();
    const startDate = subDays(endDate, 7);

    const sales = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.created_at)', 'date') // Use created_at
      .addSelect('SUM(transaction.total)', 'total')
      .where('transaction.created_at BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('DATE(transaction.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; total: string }>();

    // Generate last 7 days
    const result: { date: string; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(endDate, 6 - i);
      const dateStr = date.toISOString().split('T')[0];
      const sale = sales.find((s) => s.date === dateStr);
      result.push({
        date: dateStr,
        total: sale ? parseFloat(sale.total) : 0,
      });
    }

    return result;
  }

  async getMonthlySales() {
    const endDate = new Date();
    const startDate = subDays(endDate, 30); // Last 30 days

    // Group by day for the last 30 days
    const results = await this.transactionRepository.query<MonthlySalesResult[]>(
      `SELECT DATE(created_at) as date, SUM(total) as total 
       FROM transactions 
       WHERE created_at >= ? AND status = ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [startDate, TransactionStatus.COMPLETED],
    );

    return results.map((item) => ({
      date: item.date,
      total: parseFloat(item.total) || 0,
    }));
  }

  async getDailySales(startDate?: Date, endDate?: Date) {
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    if (!endDate) {
      endDate = new Date();
    }

    // Set endDate ke akhir hari
    endDate.setHours(23, 59, 59, 999);

    const sales = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DATE(transaction.created_at)', 'date')
      .addSelect('COUNT(transaction.id)', 'count')
      .addSelect('SUM(transaction.total)', 'total')
      .where('transaction.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('DATE(transaction.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string; total: string }>();

    return sales.map((s) => ({
      date: s.date,
      count: parseInt(s.count) || 0,
      total: parseFloat(s.total) || 0,
    }));
  }

  async getPaymentMethods() {
    const methods = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.paymentMethod', 'method')
      .addSelect('COUNT(transaction.id)', 'count')
      .addSelect('SUM(transaction.total)', 'total')
      .where('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('transaction.paymentMethod')
      .getRawMany<{ method: string; count: string; total: string }>();

    return methods;
  }

  // Buat transaksi baru (HANYA RESERVASI, TIDAK KURANGI STOK)
  async create(createTransactionDto: CreateTransactionDto, userId?: string): Promise<Transaction> {
    console.log('=== CREATE TRANSACTION START ===');
    console.log('DTO:', JSON.stringify(createTransactionDto, null, 2));

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
      orderType = 'OFFLINE', // Default OFFLINE untuk kasir
    } = createTransactionDto;

    // ========== VALIDASI CUSTOMER (Jika Ada) ==========
    if (customerId) {
      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer tidak ditemukan');
      }
      if (!customer.isActive) {
        throw new BadRequestException('Akun customer ini sedang dinonaktifkan.');
      }
    }

    // ========== ANTI-SPAM CHECK (ONLINE ORDERS) ==========
    if (orderType === 'ONLINE' && customerPhone) {
      const pendingCount = await this.transactionRepository.count({
        where: {
          customerPhone,
          status: TransactionStatus.PENDING,
        },
      });

      if (pendingCount >= 3) {
        throw new BadRequestException(
          'Anda memiliki 3 pesanan tertunda. Silakan selesaikan pesanan sebelumnya terlebih dahulu.',
        );
      }
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Items tidak boleh kosong');
    }

    // ========== LOGIKA EXPIRY (E-commerce Standard) ==========
    const expiresAt = new Date();
    if (orderType === 'ONLINE') {
      if (paymentMethod === PaymentMethod.CASH) {
        expiresAt.setHours(expiresAt.getHours() + 4);
      } else {
        expiresAt.setHours(expiresAt.getHours() + 24);
      }
    } else {
      expiresAt.setHours(expiresAt.getHours() + 24);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // PENTING: Validasi stok sekarang di DALAM transaction agar locking bekerja
      const validatedItems = await this.validateStock(items, queryRunner.manager);

      const subtotal = validatedItems.reduce((sum, item) => {
        return sum + item.price * item.quantity;
      }, 0);

      const total = subtotal - discount;

      // Untuk CASH, validasi pembayaran harus pas
      if (paymentMethod === PaymentMethod.CASH && paymentAmount < total) {
        throw new BadRequestException(
          `Pembayaran kurang: Rp ${(total - paymentAmount).toLocaleString()}`,
        );
      }

      const changeAmount = paymentMethod === PaymentMethod.CASH ? paymentAmount - total : 0;
      const invoiceNumber = await this.generateInvoiceNumber();

      const transaction = new Transaction();
      transaction.invoiceNumber = invoiceNumber;
      transaction.userId = userId || null;
      transaction.customerName =
        customerName || (orderType === 'ONLINE' ? 'Online Customer' : 'Guest');
      transaction.customerPhone = customerPhone || '-';
      transaction.isGuest = isGuest !== false;
      transaction.customerId = customerId || null;
      transaction.subtotal = subtotal;
      transaction.discount = discount;
      transaction.total = total;
      transaction.paymentMethod = paymentMethod;
      transaction.paymentAmount = paymentMethod === PaymentMethod.CASH ? paymentAmount : total;
      transaction.changeAmount = changeAmount;

      // ========== LOGIKA STATUS BERDASARKAN ORDER TYPE ==========
      if (orderType === 'ONLINE') {
        // Pesanan online: PENDING dulu (tunggu pembayaran)
        transaction.status = TransactionStatus.PENDING;
        transaction.orderType = OrderType.ONLINE;
      } else {
        // Pesanan offline (kasir): LANGSUNG COMPLETED
        transaction.status = TransactionStatus.COMPLETED;
        transaction.orderType = OrderType.OFFLINE;
      }

      transaction.notes = notes || null;
      // CASH OFFLINE (Kasir) -> tidak ada expiry. Lainnya -> ada expiry.
      transaction.expiresAt = orderType === 'OFFLINE' ? null : expiresAt;

      console.log('Saving transaction...');
      const savedTransaction = await queryRunner.manager.save(transaction);
      console.log('Transaction saved with ID:', savedTransaction.id);

      // Buat item transaksi
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

      // ========== LOGIKA RESERVASI & STOK ==========
      if (orderType === 'ONLINE') {
        // Online: BUAT RESERVASI (HOLD STOK)
        console.log('Creating reservations for ONLINE order...');
        await this.createReservations(savedTransaction.id, validatedItems, queryRunner.manager);
      } else {
        // Offline: LANGSUNG KURANGI STOK
        console.log('Offline order - reducing stock immediately...');

        for (const item of validatedItems) {
          for (const allocation of item.allocations) {
            const updateResultRaw = await queryRunner.manager.query<MySqlResult | MySqlResult[]>(
              `UPDATE stocks SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`,
              [allocation.quantity, allocation.stock.id, allocation.quantity],
            );

            // Cek apakah update berhasil (stok mencukupi secara atomik)
            const updateResult = Array.isArray(updateResultRaw)
              ? updateResultRaw[0]
              : updateResultRaw;
            const affectedRows = updateResult?.affectedRows ?? 0;
            if (affectedRows === 0) {
              throw new BadRequestException(
                `Stok produk ${item.product.name} di batch ${allocation.stock.batchCode} tidak cukup atau sudah berubah.`,
              );
            }

            const updatedStockResult = await queryRunner.manager.query<{ quantity: number }[]>(
              `SELECT quantity FROM stocks WHERE id = ?`,
              [allocation.stock.id],
            );
            const stockRecord = updatedStockResult[0];
            const stockAfter = stockRecord?.quantity ?? 0;
            const stockBefore = stockAfter + allocation.quantity;

            // Catat ke inventory
            const inventoryId = uuidv4();
            await queryRunner.manager.query(
              `INSERT INTO inventory (
                id, product_id, type, quantity, stock_before, stock_after, 
                batch_code, expiry_date, purchase_price, selling_price, 
                user_id, notes, reference_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                inventoryId,
                item.product.id,
                'OUT',
                -allocation.quantity,
                stockBefore,
                stockAfter,
                allocation.stock.batchCode,
                allocation.stock.expiryDate,
                allocation.stock.purchasePrice,
                allocation.stock.sellingPrice,
                userId || null,
                `Transaksi Kasir ${invoiceNumber}`,
                savedTransaction.id,
              ],
            );
          }
        }
      }

      await queryRunner.commitTransaction();
      console.log('Transaction committed successfully');

      // Update Customer Stats if it's an OFFLINE order (immediately completed)
      if (orderType === 'OFFLINE' && customerId) {
        await this.updateCustomerStats(customerId);
      }

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
  }

  async confirmPayment(transactionId: string, adminId: string) {
    console.log('========== CONFIRM PAYMENT ==========');
    console.log(`Transaction ID: ${transactionId}, Admin: ${adminId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cek apakah transaksi ada dan status PENDING atau PROCESSING
      const transactions = await queryRunner.manager.query<RawTransaction[]>(
        `SELECT id, invoice_number, status, customer_id, total FROM transactions WHERE id = ? AND status IN (?, ?)`,
        [transactionId, 'PENDING', 'PROCESSING'],
      );

      if (!transactions || transactions.length === 0) {
        throw new BadRequestException('Transaksi tidak ditemukan atau sudah diproses');
      }

      const transaction = transactions[0];
      console.log('Transaction found:', transaction.invoice_number);

      // 2. Ambil semua reservasi aktif
      const reservations = await queryRunner.manager.query<RawReservation[]>(
        `SELECT r.*, s.quantity as stock_quantity, s.batch_code, s.expiry_date, 
              s.purchase_price, s.selling_price, p.name as product_name
       FROM reservations r
       JOIN stocks s ON s.id = r.stock_id
       JOIN products p ON p.id = r.product_id
       WHERE r.transaction_id = ? AND r.status = ?`,
        [transactionId, 'ACTIVE'],
      );

      console.log(`Found ${reservations.length} reservations`);

      if (reservations.length === 0) {
        throw new BadRequestException(
          'Tidak ada reservasi aktif ditemukan untuk transaksi ini. Mungkin pesanan sudah kadaluarsa atau dibatalkan.',
        );
      }

      // 3. KURANGI STOK dan UPDATE RESERVASI untuk setiap item
      for (const res of reservations) {
        console.log(`Updating stock ${res.stock_id}, quantity ${res.quantity}`);

        // Validasi stock_quantity
        if (res.stock_quantity === undefined || res.stock_quantity === null) {
          throw new BadRequestException(`Data stok tidak valid untuk produk: ${res.product_name}`);
        }

        // Update stok - kurangi quantity
        const updateResultRaw = await queryRunner.manager.query<MySqlResult | MySqlResult[]>(
          `UPDATE stocks SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`,
          [res.quantity, res.stock_id, res.quantity],
        );

        const updateResult = Array.isArray(updateResultRaw) ? updateResultRaw[0] : updateResultRaw;
        const affectedRows = updateResult?.affectedRows ?? 0;

        if (affectedRows === 0) {
          throw new BadRequestException(
            `Gagal mengurangi stok ${res.product_name}. Stok di batch ini mungkin tidak cukup.`,
          );
        }

        // Update status reservasi menjadi CONFIRMED
        await queryRunner.manager.query(
          `UPDATE reservations 
         SET status = ?, confirmed_at = NOW() 
         WHERE id = ?`,
          ['CONFIRMED', res.id],
        );

        // Catat ke inventory - gunakan uuidv4 dari import
        const inventoryId = uuidv4();

        await queryRunner.manager.query(
          `INSERT INTO inventory (
    id, product_id, type, quantity, stock_before, stock_after, 
    batch_code, expiry_date, purchase_price, selling_price, 
    user_id, notes, reference_id, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            inventoryId,
            res.product_id,
            'OUT', // <-- UBAH DARI 'SALE' MENJADI 'OUT'
            -res.quantity,
            res.stock_quantity,
            res.stock_quantity - res.quantity,
            res.batch_code,
            res.expiry_date,
            res.purchase_price,
            res.selling_price,
            adminId || null,
            `Transaksi ${transaction.invoice_number}`,
            transactionId,
          ],
        );
      }

      // 4. Update status transaksi menjadi COMPLETED
      await queryRunner.manager.query(`UPDATE transactions SET status = ? WHERE id = ?`, [
        'COMPLETED',
        transactionId,
      ]);

      await queryRunner.commitTransaction();
      console.log('✅ SUCCESS');

      // Update Customer Stats
      if (transaction.customer_id) {
        await this.updateCustomerStats(transaction.customer_id);
      }

      // Kembalikan data transaksi terbaru
      return this.findOne(transactionId);
    } catch (error) {
      console.error('❌ ERROR DETAIL:', error);
      await queryRunner.rollbackTransaction();
      throw error; // Ini akan menyebabkan response 500
    } finally {
      await queryRunner.release();
    }
  }

  // BATALKAN TRANSAKSI (Stok kembali)
  async cancelTransaction(transactionId: string, reason: string) {
    console.log('=== CANCEL TRANSACTION START ===');
    console.log(`Transaction ID: ${transactionId}, Reason: ${reason}`);

    const transaction = await this.findOne(transactionId);

    if (
      ![
        TransactionStatus.PENDING,
        TransactionStatus.PROCESSING,
        TransactionStatus.COMPLETED,
      ].includes(transaction.status)
    ) {
      throw new BadRequestException('Transaksi tidak dapat dibatalkan');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Jika transaksi sudah COMPLETED, kita harus mengembalikan stok secara eksplisit
      if (transaction.status === TransactionStatus.COMPLETED) {
        console.log('Returning stock for COMPLETED transaction...');

        // Ambil items dengan detail stok
        const items = await queryRunner.manager.find(TransactionItem, {
          where: { transactionId: transaction.id },
          relations: ['product'],
        });

        for (const item of items) {
          if (item.stockId) {
            // Update quantity di tabel stocks
            await queryRunner.manager.query(
              `UPDATE stocks SET quantity = quantity + ? WHERE id = ?`,
              [item.quantity, item.stockId],
            );

            // Ambil info stok terbaru untuk log inventory
            const currentStock = await queryRunner.manager.query<
              {
                quantity: number;
                batchCode: string | null;
                expiryDate: Date | null;
                purchasePrice: number | null;
                sellingPrice: number | null;
              }[]
            >(`SELECT * FROM stocks WHERE id = ?`, [item.stockId]);

            const stock = currentStock[0];

            // Catat ke log inventory (sebagai barang masuk / koreksi)
            const inventoryId = uuidv4();
            await queryRunner.manager.query(
              `INSERT INTO inventory (
                id, product_id, type, quantity, stock_before, stock_after, 
                batch_code, expiry_date, purchase_price, selling_price, 
                user_id, notes, reference_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                inventoryId,
                item.productId,
                'IN', // Koreksi masuk
                item.quantity,
                stock.quantity - item.quantity,
                stock.quantity,
                stock.batchCode,
                stock.expiryDate,
                stock.purchasePrice,
                stock.sellingPrice,
                null, // Untuk saat ini null, atau bisa dioper dari controller
                `VOID Transaksi ${transaction.invoiceNumber}`,
                transaction.id,
              ],
            );
          }
        }
      } else {
        // Jika PENDING/PROCESSING, batalkan reservasi (karena stok belum benar-benar keluar)
        const updateResult = await queryRunner.manager
          .createQueryBuilder()
          .update(Reservation)
          .set({ status: ReservationStatus.CANCELLED })
          .where('transactionId = :transactionId', { transactionId })
          .andWhere('status = :status', { status: ReservationStatus.ACTIVE })
          .execute();

        console.log(`Reservations cancelled: ${updateResult.affected}`);
      }

      // Update status transaksi
      transaction.status = TransactionStatus.CANCELLED;
      transaction.notes = transaction.notes
        ? `CANCELLED: ${reason} | ${transaction.notes}`
        : `CANCELLED: ${reason}`;

      await queryRunner.manager.save(transaction);
      console.log(`Transaction status updated to CANCELLED`);

      await queryRunner.commitTransaction();
      console.log('=== CANCEL TRANSACTION SUCCESS ===');

      // Update Customer Stats if it was a completed transaction
      if (transaction.status === TransactionStatus.CANCELLED && transaction.customerId) {
        await this.updateCustomerStats(transaction.customerId);
      }

      return {
        message: 'Transaksi dibatalkan, stok tersedia kembali',
        transaction,
      };
    } catch (error) {
      console.error('Cancel transaction error, rolling back:', error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // PROSES RESERVASI EXPIRED (Cron job)
  async processExpiredReservations() {
    console.log('=== PROCESS EXPIRED RESERVATIONS START ===');
    const now = new Date();

    const expiredReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.transaction', 'transaction')
      .where('reservation.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('reservation.expiresAt < :now', { now })
      .getMany();

    console.log(`Found ${expiredReservations.length} expired reservations`);

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

    console.log(`Processed ${expiredReservations.length} expired reservations`);
    console.log('=== PROCESS EXPIRED RESERVATIONS END ===');

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

  // Cari transaksi berdasarkan ID - FIXED
  async findOne(id: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.product',
        'user',
        'reservations',
        'reservations.stock', // <-- TAMBAHKAN INI
        'reservations.product', // <-- TAMBAHKAN INI
      ],
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return transaction;
  }

  // Cari berdasarkan invoice number - FIXED
  async findByInvoice(invoiceNumber: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { invoiceNumber },
      relations: [
        'items',
        'items.product',
        'user',
        'reservations',
        'reservations.stock', // <-- TAMBAHKAN INI
        'reservations.product', // <-- TAMBAHKAN INI
      ],
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
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('transaction.reservations', 'reservations')
      .leftJoinAndSelect('reservations.stock', 'stock');

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

  // UPDATE Statistik Customer (Counter)
  private async updateCustomerStats(customerId: string) {
    console.log(`Updating stats for customer: ${customerId}`);
    try {
      const results = await this.transactionRepository.query<{ count: string; total: string }[]>(
        `SELECT COUNT(*) as count, SUM(total) as total 
         FROM transactions 
         WHERE customer_id = ? AND status = ?`,
        [customerId, TransactionStatus.COMPLETED],
      );

      if (results.length > 0) {
        await this.customerRepository.update(customerId, {
          totalTransactions: parseInt(results[0].count),
          totalSpent: parseFloat(results[0].total) || 0,
        });
      }
      console.log('Customer stats updated successfully');
    } catch (error) {
      console.error('Error updating customer stats:', error);
    }
  }
  // Dapatkan transaksi customer
  async findByCustomer(customerId: string) {
    const transactions = await this.transactionRepository.find({
      where: { customerId },
      relations: ['items', 'items.product', 'reservations'],
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

    const results = await this.transactionRepository.query<
      { count: string; total: string; payment: string; average: string }[]
    >(
      `SELECT 
        COUNT(*) as count, 
        SUM(total) as total,
        SUM(payment_amount) as payment,
        AVG(total) as average
       FROM transactions 
       WHERE DATE(created_at) = CURRENT_DATE() AND status = ?`,
      [TransactionStatus.COMPLETED],
    );

    return {
      date: new Date().toISOString().split('T')[0],
      count: parseInt(results[0].count) || 0,
      total: parseFloat(results[0].total) || 0,
      payment: parseFloat(results[0].payment) || 0,
      average: parseFloat(results[0].average) || 0,
    };
  }

  // PROSES RETUR BARANG (Stok kembali)
  async processReturn(transactionId: string, reason: string, userId?: string) {
    console.log('=== PROCESS RETURN START ===');
    const transaction = await this.findOne(transactionId);

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Hanya transaksi COMPLETED yang bisa diretur');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of transaction.items) {
        await queryRunner.manager.query(`UPDATE stocks SET quantity = quantity + ? WHERE id = ?`, [
          item.quantity,
          item.stockId,
        ]);

        const updatedStockResult = await queryRunner.manager.query<
          {
            quantity: number;
            batch_code: string;
            expiry_date: string;
            purchase_price: number;
            selling_price: number;
          }[]
        >(
          `SELECT quantity, batch_code, expiry_date, purchase_price, selling_price FROM stocks WHERE id = ?`,
          [item.stockId],
        );
        const stockRecord = updatedStockResult[0];
        const stockAfter = stockRecord?.quantity ?? 0;
        const stockBefore = stockAfter - item.quantity;

        const inventoryId = uuidv4();
        await queryRunner.manager.query(
          `INSERT INTO inventory (
            id, product_id, type, quantity, stock_before, stock_after, 
            batch_code, expiry_date, purchase_price, selling_price, 
            user_id, notes, reference_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            inventoryId,
            item.productId,
            'RETURN',
            item.quantity,
            stockBefore,
            stockAfter,
            stockRecord?.batch_code || null,
            stockRecord?.expiry_date || null,
            stockRecord?.purchase_price || 0,
            stockRecord?.selling_price || 0,
            userId || null,
            `RETUR: ${reason} (Inv: ${transaction.invoiceNumber})`,
            transaction.id,
          ],
        );
      }

      transaction.status = TransactionStatus.RETURNED;
      transaction.notes = transaction.notes
        ? `RETURNED: ${reason} | ${transaction.notes}`
        : `RETURNED: ${reason}`;

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      // Update Customer Stats
      if (transaction.customerId) {
        await this.updateCustomerStats(transaction.customerId);
      }

      return { message: 'Barang berhasil diretur, stok telah dikembalikan', transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // SYNC Semua Statistik Customer (Fix historis)
  async syncAllCustomerStats() {
    console.log('=== SYNC ALL CUSTOMER STATS START ===');
    const customers = await this.customerRepository.find({ select: ['id', 'name'] });
    console.log(`Found ${customers.length} customers to sync`);

    let successCount = 0;
    for (const customer of customers) {
      try {
        await this.updateCustomerStats(customer.id);
        successCount++;
      } catch (err) {
        console.error(`Failed to sync customer ${customer.id}:`, err);
      }
    }

    console.log(`=== SYNC ALL CUSTOMER STATS END: ${successCount}/${customers.length} Success ===`);
    return {
      message: 'Sinkronisasi statistik selesai',
      total: customers.length,
      success: successCount,
    };
  }
}
