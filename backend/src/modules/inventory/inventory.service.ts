import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan } from 'typeorm';
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

    // Validasi product
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Gunakan transaction biar aman
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cari stock existing
      let stock: Stock | null = null;

      if (batchCode) {
        stock = await queryRunner.manager.findOne(Stock, {
          where: {
            productId,
            batchCode,
          },
        });
      } else {
        stock = await queryRunner.manager.findOne(Stock, {
          where: {
            productId,
            batchCode: null as any,
          },
        });
      }

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
        stockAfter = 0;
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
        // Create new stock
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
      inventory.quantity = type === InventoryType.OUT ? -quantity : quantity;
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

      // Commit transaction
      await queryRunner.commitTransaction();

      return {
        product,
        stock,
        inventory,
        message: 'Stok berhasil diupdate',
      };
    } catch (error) {
      // Rollback kalau error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async getStock(productId?: string, batchCode?: string) {
    const query = this.stockRepository
      .createQueryBuilder('stock')
      .leftJoinAndSelect('stock.product', 'product');

    if (productId) {
      query.andWhere('stock.productId = :productId', { productId });
    }

    if (batchCode) {
      query.andWhere('stock.batchCode = :batchCode', { batchCode });
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

  async checkExpiredProducts() {
    const today = new Date();

    const expiredStocks = await this.stockRepository.find({
      where: {
        expiryDate: LessThan(today),
        quantity: MoreThan(0),
      },
      relations: ['product'],
    });

    // Definisikan tipe untuk result
    type ExpiredResult = {
      product: Product;
      stock: Stock;
      inventory: Inventory;
      message: string;
    };

    const results: ExpiredResult[] = [];
    const errors: any[] = [];

    for (const stock of expiredStocks) {
      try {
        const result = await this.addStock({
          productId: stock.productId,
          type: InventoryType.EXPIRED,
          quantity: stock.quantity,
          batchCode: stock.batchCode || undefined,
          notes: `Auto expired - ${today.toISOString().split('T')[0]}`,
        });

        // Type assertion karena kita tahu strukturnya
        results.push(result as ExpiredResult);
      } catch (error) {
        console.error(`Failed to process expired stock ${stock.id}:`, error);
        errors.push({
          stockId: stock.id,
          productId: stock.productId,
          error: error.message,
        });
      }
    }

    return {
      processed: results.length,
      failed: errors.length,
      total: expiredStocks.length,
      results,
      errors,
    };
  }
}
