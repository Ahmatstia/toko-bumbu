import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan, IsNull } from 'typeorm';
import { Inventory, InventoryType } from './entities/inventory.entity';
import { Stock } from './entities/stock.entity';
import { Product } from '../products/entities/product.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';

export interface GroupedStock {
  id: string;
  productId: string;
  product: Product;
  totalQuantity: number;
  batches: Stock[];
  minSellingPrice: number;
  maxSellingPrice: number;
  minPurchasePrice: number;
  maxPurchasePrice: number;
  earliestExpiryDate: Date | null;
}

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
  ) {
    // Jalankan cleanup saat service diinisialisasi
    this.cleanupOrphanedStock().catch((err) =>
      console.error('Failed to cleanup orphaned stock on startup', err),
    );
  }

  async cleanupOrphanedStock() {
    const orphanedStocks = await this.stockRepository
      .createQueryBuilder('stock')
      .leftJoin('stock.product', 'product')
      .where('product.id IS NULL')
      .getMany();

    if (orphanedStocks.length > 0) {
      console.log(`🧹 Cleaning up ${orphanedStocks.length} orphaned stock entries...`);
      await this.stockRepository.remove(orphanedStocks);
    }
    return orphanedStocks.length;
  }

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

      const whereCondition = {
        productId: productId,
        batchCode: batchCode || IsNull(),
      };

      stock = await queryRunner.manager.findOne(Stock, {
        where: whereCondition as any,
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
    // Gunakan tanggal awal hari ini untuk perbandingan yang akurat
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Jam 00:00:00 hari ini

    console.log('🔍 Mencari stok expired hingga:', today.toISOString());

    const expiredStocks = await this.stockRepository.find({
      where: {
        expiryDate: LessThan(today), // expiryDate < 00:00:00 hari ini = sudah lewat
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

        const result = await this.addStock(
          {
            productId: stock.productId,
            type: InventoryType.EXPIRED,
            quantity: stock.quantity,
            batchCode: stock.batchCode || undefined,
            notes: `Auto expired - ${today.toISOString().split('T')[0]}`,
          },
          'system',
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

  async getStock(
    productId?: string,
    batchCode?: string,
    search?: string,
    lowStock?: boolean,
    expiringSoon?: boolean,
    days: number = 30,
    isGrouped: boolean = false,
  ) {
    // 1. Dapatkan Statistik Keseluruhan (Global - Abaikan filter kecuali productId jika ada)
    const statsQuery = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product');

    if (productId) {
      statsQuery.andWhere('stock.productId = :productId', { productId });
    }

    const allStocksForStats = await statsQuery.getMany();

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + days);

    const stats = {
      safe: allStocksForStats.filter((s) => s.quantity > (s.product?.minStock ?? 0)).length,
      low: allStocksForStats.filter(
        (s) => s.quantity > 0 && s.quantity <= (s.product?.minStock ?? 0),
      ).length,
      out: allStocksForStats.filter((s) => s.quantity === 0).length,
      // Sudah melewati tanggal kadaluarsa dan masih ada stoknya
      expired: allStocksForStats.filter((s) => {
        if (!s.expiryDate || s.quantity === 0) return false;
        return new Date(s.expiryDate) < now; // sudah lewat hari ini
      }).length,
      // Akan expired dalam X hari ke depan (belum expired)
      expiring: allStocksForStats.filter((s) => {
        if (!s.expiryDate || s.quantity === 0) return false;
        const expiry = new Date(s.expiryDate);
        return expiry >= now && expiry <= expiryThreshold; // belum expired tapi mau expired
      }).length,
    };

    // 2. Query Data Stok dengan Filter Aktif
    const query = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product');

    if (productId) {
      query.andWhere('stock.productId = :productId', { productId });
    }

    if (batchCode) {
      query.andWhere('stock.batchCode = :batchCode', { batchCode });
    }

    if (search) {
      query.andWhere(
        '(LOWER(product.name) LIKE LOWER(:search) OR LOWER(COALESCE(stock.batchCode, "")) LIKE LOWER(:search) OR LOWER(product.sku) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (lowStock) {
      query.andWhere('stock.quantity <= product.minStock').andWhere('stock.quantity > 0');
    }

    if (expiringSoon) {
      query
        .andWhere('stock.expiryDate IS NOT NULL')
        .andWhere('stock.expiryDate <= :expiryThreshold', { expiryThreshold })
        .andWhere('stock.quantity > 0');
    }

    const stocks = await query
      .orderBy('stock.expiryDate', 'ASC')
      .addOrderBy('stock.createdAt', 'DESC')
      .getMany();

    if (isGrouped) {
      const groupedMap = new Map<string, GroupedStock>();

      stocks.forEach((s) => {
        if (!s.product) return;

        const pId = s.productId;
        if (!groupedMap.has(pId)) {
          groupedMap.set(pId, {
            id: `group-${pId}`,
            productId: pId,
            product: s.product,
            totalQuantity: 0,
            batches: [],
            minSellingPrice: s.sellingPrice || 0,
            maxSellingPrice: s.sellingPrice || 0,
            minPurchasePrice: s.purchasePrice || 0,
            maxPurchasePrice: s.purchasePrice || 0,
            earliestExpiryDate: s.expiryDate,
          });
        }

        const group = groupedMap.get(pId)!;
        group.batches.push(s);

        // Hanya hitung totalQuantity dari batch yang belum expired
        const isExpired = s.expiryDate && new Date(s.expiryDate) < now;
        if (!isExpired) {
          group.totalQuantity += s.quantity;
        }

        if (s.sellingPrice) {
          group.minSellingPrice =
            group.minSellingPrice === 0
              ? s.sellingPrice
              : Math.min(group.minSellingPrice, s.sellingPrice);
          group.maxSellingPrice = Math.max(group.maxSellingPrice, s.sellingPrice);
        }

        if (s.purchasePrice) {
          group.minPurchasePrice =
            group.minPurchasePrice === 0
              ? s.purchasePrice
              : Math.min(group.minPurchasePrice, s.purchasePrice);
          group.maxPurchasePrice = Math.max(group.maxPurchasePrice, s.purchasePrice);
        }

        if (
          s.expiryDate &&
          (!group.earliestExpiryDate || new Date(s.expiryDate) < new Date(group.earliestExpiryDate))
        ) {
          group.earliestExpiryDate = s.expiryDate;
        }
      });

      return {
        stocks: Array.from(groupedMap.values()),
        stats,
        isGrouped: true,
      };
    }

    // Untuk non-grouped: hitung total hanya dari stok yang belum expired
    const totalStock = stocks.reduce((sum, s) => {
      const isExpired = s.expiryDate && new Date(s.expiryDate) < now;
      return sum + (isExpired ? 0 : s.quantity);
    }, 0);

    return {
      stocks,
      totalStock,
      stats,
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

  async getLatestPrices(productId: string) {
    const latestStock = await this.stockRepository.findOne({
      where: { productId },
      order: { createdAt: 'DESC' },
    });

    if (!latestStock) {
      return {
        purchasePrice: 0,
        sellingPrice: 0,
      };
    }

    return {
      purchasePrice: Number(latestStock.purchasePrice) || 0,
      sellingPrice: Number(latestStock.sellingPrice) || 0,
    };
  }
}
