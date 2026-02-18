import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan, Like } from 'typeorm';
import { Inventory, InventoryType } from './entities/inventory.entity';
import { Stock } from './entities/stock.entity';
import { Product } from '../products/entities/product.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async addStock(createInventoryDto: CreateInventoryDto, userId?: string) {
    const {
      productId,
      quantity,
      type,
      batchCode,
      expiryDate,
      purchasePrice,
      sellingPrice,
      notes,
      referenceId,
    } = createInventoryDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cari stock existing
      let stock: Stock | null = null;

      const whereCondition: any = { productId };
      if (batchCode) {
        whereCondition.batchCode = batchCode;
      } else {
        whereCondition.batchCode = null;
      }

      stock = await queryRunner.manager.findOne(Stock, {
        where: whereCondition,
      });

      const stockBefore = stock?.quantity || 0;
      let stockAfter: number;

      // Hitung stok baru berdasarkan tipe
      if (type === InventoryType.IN || type === InventoryType.RETURN) {
        stockAfter = stockBefore + quantity;
      } else if (type === InventoryType.OUT) {
        if (stockBefore < quantity) {
          throw new BadRequestException(
            `Stok tidak cukup. Tersedia: ${stockBefore}, Diminta: ${quantity}`,
          );
        }
        stockAfter = stockBefore - quantity;
      } else if (type === InventoryType.ADJUSTMENT) {
        stockAfter = quantity;
      } else if (type === InventoryType.EXPIRED) {
        stockAfter = 0; // Stok expired jadi 0
      } else {
        throw new BadRequestException('Tipe inventory tidak valid');
      }

      // Update atau create stock
      if (stock) {
        stock.quantity = stockAfter;
        if (purchasePrice) stock.purchasePrice = purchasePrice;
        if (sellingPrice) stock.sellingPrice = sellingPrice;
        if (expiryDate) stock.expiryDate = new Date(expiryDate);
        if (batchCode) stock.batchCode = batchCode;
        await queryRunner.manager.save(stock);
      } else {
        const newStock = new Stock();
        newStock.productId = productId;
        newStock.quantity = stockAfter;
        newStock.batchCode = batchCode || null;
        newStock.expiryDate = expiryDate ? new Date(expiryDate) : null;
        newStock.purchasePrice = purchasePrice || null;
        newStock.sellingPrice = sellingPrice || null;

        stock = await queryRunner.manager.save(newStock);
      }

      // Catat history inventory
      const inventory = new Inventory();
      inventory.productId = productId;
      inventory.type = type;
      inventory.quantity =
        type === InventoryType.OUT || type === InventoryType.EXPIRED ? -quantity : quantity;
      inventory.stockBefore = stockBefore;
      inventory.stockAfter = stockAfter;
      inventory.batchCode = batchCode || null;
      inventory.expiryDate = expiryDate ? new Date(expiryDate) : null;
      inventory.purchasePrice = purchasePrice || null;
      inventory.sellingPrice = sellingPrice || null;
      inventory.userId = userId || null;
      inventory.notes = notes || null;
      inventory.referenceId = referenceId || null;

      await queryRunner.manager.save(inventory);

      await queryRunner.commitTransaction();

      return {
        product,
        stock,
        inventory,
        message: 'Stok berhasil diupdate',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // CEK DAN PROSES STOK EXPIRED - FIXED
  async checkExpiredProducts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('🔍 Mencari stok expired sebelum:', today.toISOString());

    const expiredStocks = await this.stockRepository.find({
      where: {
        expiryDate: LessThan(today),
        quantity: MoreThan(0),
      },
      relations: ['product'],
    });

    console.log(`📊 Ditemukan ${expiredStocks.length} stok expired`);

    // Definisikan tipe untuk result
    type ExpiredResult = {
      product: Product;
      stock: Stock;
      inventory: Inventory;
      message: string;
    };

    const results: ExpiredResult[] = [];

    // Proses satu per satu dengan delay untuk menghindari deadlock
    for (const stock of expiredStocks) {
      try {
        console.log(`⚙️ Memproses expired: ${stock.product?.name} - ${stock.quantity} unit`);

        // FIX: Tambahkan userId 'system' untuk identifikasi
        const result = await this.addStock(
          {
            productId: stock.productId,
            type: InventoryType.EXPIRED,
            quantity: stock.quantity,
            batchCode: stock.batchCode || undefined,
            notes: `Auto expired - ${today.toISOString().split('T')[0]}`,
          },
          'system', // <-- TAMBAHKAN USER ID
        );

        results.push(result as ExpiredResult);

        // Delay kecil untuk menghindari deadlock
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Gagal memproses expired stock ${stock.id}:`, error);
      }
    }

    return {
      processed: results.length,
      total: expiredStocks.length,
      results,
      message: `${results.length} dari ${expiredStocks.length} stok expired telah diproses`,
    };
  }

  // Auto-cancel expired transactions (panggil via cron job)
  async autoCancelExpiredTransactions() {
    return this.checkExpiredProducts();
  }

  // FIXED: Tambahkan parameter search
  async getStock(productId?: string, batchCode?: string, search?: string) {
    const query = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product');

    if (productId) {
      query.andWhere('stock.productId = :productId', { productId });
    }

    if (batchCode) {
      query.andWhere('stock.batchCode = :batchCode', { batchCode });
    }

    // TAMBAHKAN PENCARIAN BERDASARKAN NAMA PRODUK
    if (search) {
      query.andWhere('product.name LIKE :search', { search: `%${search}%` });
    }

    const stocks = await query
      .orderBy('stock.expiryDate', 'ASC')
      .addOrderBy('stock.createdAt', 'DESC')
      .getMany();

    const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);

    return {
      stocks,
      totalStock,
      productId,
    };
  }

  async getInventoryHistory(
    productId?: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 20,
  ) {
    const query = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.user', 'user');

    if (productId) {
      query.andWhere('inventory.productId = :productId', { productId });
    }

    if (startDate) {
      query.andWhere('inventory.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('inventory.createdAt <= :endDate', { endDate });
    }

    const [data, total] = await query
      .orderBy('inventory.createdAt', 'DESC')
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

  async getLowStock(threshold: number = 5) {
    const stocks = await this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .where('stock.quantity <= :threshold', { threshold })
      .andWhere('stock.quantity > 0')
      .orderBy('stock.quantity', 'ASC')
      .getMany();

    return stocks;
  }

  async getExpiringSoon(days: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const stocks = await this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product')
      .where('stock.expiryDate IS NOT NULL')
      .andWhere('stock.expiryDate <= :expiryDate', { expiryDate })
      .andWhere('stock.quantity > 0')
      .orderBy('stock.expiryDate', 'ASC')
      .getMany();

    return stocks;
  }
}
