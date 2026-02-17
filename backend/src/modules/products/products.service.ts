import {
  Injectable,
  NotFoundException,
  ConflictException,
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

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);

    // Kalau ganti category, validasi
    // Perbaikan: cek dulu apakah categoryId ada di DTO
    if (
      updateProductDto.categoryId &&
      updateProductDto.categoryId !== product.categoryId
    ) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Hapus categoryId dari object sebelum assign (karena udah divalidasi)
    const { categoryId, ...updateData } = updateProductDto;

    // Assign data yang akan diupdate
    Object.assign(product, updateData);

    // Set categoryId baru jika ada
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
