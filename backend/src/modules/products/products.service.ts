// backend/src/modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async generateSku(name: string, categoryName: string): Promise<string> {
    // Format: CAT-NAME-001
    const categoryPrefix = categoryName
      .split(' ')
      .map((word) => word.substring(0, 2).toUpperCase())
      .join('')
      .substring(0, 4);

    const namePrefix = name
      .split(' ')
      .map((word) => word.substring(0, 2).toUpperCase())
      .join('')
      .substring(0, 4);

    // Cari produk terakhir
    const lastProduct = await this.productRepository.findOne({
      where: { sku: Like(`${categoryPrefix}-${namePrefix}-%`) },
      order: { sku: 'DESC' },
    });

    let nextNumber = 1;
    if (lastProduct) {
      const lastNumber = parseInt(lastProduct.sku.split('-').pop() || '0');
      nextNumber = lastNumber + 1;
    }

    return `${categoryPrefix}-${namePrefix}-${nextNumber.toString().padStart(3, '0')}`;
  }

  async create(createProductDto: CreateProductDto) {
    // Cek category
    const category = await this.categoryRepository.findOne({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Generate SKU
    let sku = createProductDto.sku;
    if (!sku) {
      sku = await this.generateSku(createProductDto.name, category.name);
    }

    // Cek SKU duplikat
    const existingProduct = await this.productRepository.findOne({
      where: { sku },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with SKU ${sku} already exists`);
    }

    const product = this.productRepository.create({
      ...createProductDto,
      sku,
    });

    return await this.productRepository.save(product);
  }

  async findAll(
    categoryId?: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    isPublic: boolean = false,
  ) {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      query.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search OR product.barcode LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isPublic) {
      query.andWhere('product.isActive = :isActive', { isActive: true });
    } else if (isActive !== undefined) {
      query.andWhere('product.isActive = :isActive', { isActive });
    }

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('product.name', 'ASC')
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

  // ========== PERBAIKAN: METHOD GET TOP SELLING ==========
  async getTopSelling(startDate?: Date, endDate?: Date, limit: number = 10) {
    try {
      console.log('Getting top selling products...');
      console.log('StartDate:', startDate);
      console.log('EndDate:', endDate);
      console.log('Limit:', limit);

      // Gunakan query builder dengan raw SQL join
      const query = this.productRepository
        .createQueryBuilder('product')
        .leftJoin('transaction_items', 'item', 'item.product_id = product.id')
        .leftJoin('transactions', 'transaction', 'transaction.id = item.transaction_id')
        .select('product.id', 'id')
        .addSelect('product.name', 'name')
        .addSelect('product.image_url', 'image')
        .addSelect('COALESCE(SUM(item.quantity), 0)', 'sold')
        .addSelect('COALESCE(SUM(item.subtotal), 0)', 'revenue')
        .groupBy('product.id')
        .orderBy('sold', 'DESC')
        .limit(limit);

      if (startDate) {
        query.andWhere('transaction.created_at >= :startDate', {
          startDate: startDate,
        });
      }

      if (endDate) {
        // Buat copy date agar tidak mengubah original
        const endDateCopy = new Date(endDate);
        endDateCopy.setHours(23, 59, 59, 999);

        query.andWhere('transaction.created_at <= :endDate', {
          endDate: endDateCopy,
        });
      }

      // Hanya transaksi COMPLETED
      query.andWhere('transaction.status = :status', { status: 'COMPLETED' });

      console.log('SQL:', query.getSql());

      const results = await query.getRawMany();
      console.log('Results:', results);

      return results.map((item) => ({
        id: item.id,
        name: item.name,
        image: item.image,
        sold: parseInt(item.sold) || 0,
        revenue: parseFloat(item.revenue) || 0,
      }));
    } catch (error) {
      console.error('Error in getTopSelling:', error);
      throw error;
    }
  }

  // METHOD KHUSUS UNTUK PUBLIC
  async findAllPublic(categoryId?: string, search?: string, page: number = 1, limit: number = 12) {
    return this.findAll(categoryId, search, page, limit, undefined, true);
  }

  // METHOD UNTUK DROPDOWN
  async findAllForDropdown() {
    const products = await this.productRepository.find({
      relations: ['category'],
      order: {
        name: 'ASC',
      },
    });
    return products;
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async getTopProducts(limit: number = 5) {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('transaction_items', 'item', 'item.product_id = product.id')
      .leftJoin('transactions', 'transaction', 'transaction.id = item.transaction_id')
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('product.image_url', 'image')
      .addSelect('SUM(item.quantity)', 'sold')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .where('transaction.status = :status', { status: 'COMPLETED' })
      .groupBy('product.id')
      .orderBy('sold', 'DESC')
      .limit(limit)
      .getRawMany();

    return products;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (updateProductDto.categoryId && updateProductDto.categoryId !== product.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const { categoryId, ...updateData } = updateProductDto;
    Object.assign(product, updateData);

    if (updateProductDto.categoryId) {
      product.categoryId = updateProductDto.categoryId;
    }

    return await this.productRepository.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return { message: 'Product deleted successfully' };
  }
}
