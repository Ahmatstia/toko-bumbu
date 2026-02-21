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
import { ProductImage } from './entities/product-image.entity';
import { Category } from '../categories/entities/category.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
  ) {}

  async generateSku(name: string, categoryName: string): Promise<string> {
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

  async findAllForPos() {
    const products = await this.productRepository.find({
      where: { isActive: true },
      relations: ['category', 'images'],
      order: { name: 'ASC' },
    });

    if (products.length === 0) return [];

    const productIds = products.map((p) => p.id);

    // Ambil total stok dan harga jual terbaru/tertinggi
    const stocks = await this.stockRepository
      .createQueryBuilder('stock')
      .select('stock.productId', 'productId')
      .addSelect('SUM(stock.quantity)', 'totalStock')
      .addSelect('MAX(stock.sellingPrice)', 'price')
      .where('stock.productId IN (:...productIds)', { productIds })
      .andWhere('stock.isActive = :isActive', { isActive: true })
      .andWhere('(stock.expiryDate IS NULL OR stock.expiryDate > CURRENT_DATE())') // Filter expired
      .groupBy('stock.productId')
      .getRawMany<{ productId: string; totalStock: string; price: string }>();

    const stockMap = stocks.reduce(
      (acc, curr) => {
        acc[curr.productId] = {
          quantity: parseInt(curr.totalStock) || 0,
          price: parseFloat(curr.price) || 0,
        };
        return acc;
      },
      {} as Record<string, { quantity: number; price: number }>,
    );

    return products.map((product) => {
      const stockInfo = stockMap[product.id] || { quantity: 0, price: 0 };
      return {
        ...product,
        stockQuantity: stockInfo.quantity,
        price: stockInfo.price,
      };
    });
  }

  async create(createProductDto: CreateProductDto, imageUrls: string[] = []) {
    const category = await this.categoryRepository.findOne({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    let sku = createProductDto.sku;
    if (!sku) {
      sku = await this.generateSku(createProductDto.name, category.name);
    }

    const existingProduct = await this.productRepository.findOne({
      where: { sku },
    });

    if (existingProduct) {
      throw new ConflictException(`Product with SKU ${sku} already exists`);
    }

    const productData: Partial<Product> = {
      name: createProductDto.name,
      description: createProductDto.description,
      categoryId: createProductDto.categoryId,
      unit: createProductDto.unit,
      sku,
      barcode: createProductDto.barcode,
      minStock: createProductDto.minStock || 5,
      imageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
      isActive: createProductDto.isActive !== undefined ? createProductDto.isActive : true,
    };

    const product = this.productRepository.create(productData);
    const savedProduct = await this.productRepository.save(product);

    // Simpan semua gambar ke tabel product_images
    if (imageUrls.length > 0) {
      const images = imageUrls.map((url, index) =>
        this.productImageRepository.create({
          productId: savedProduct.id,
          imageUrl: url,
          isPrimary: index === 0,
          sortOrder: index,
        }),
      );
      await this.productImageRepository.save(images);
    }

    // Buat stok awal jika ada harga/stok
    if (createProductDto.price !== undefined || createProductDto.initialStock !== undefined) {
      const stock = this.stockRepository.create({
        productId: savedProduct.id,
        quantity: createProductDto.initialStock || 0,
        sellingPrice: createProductDto.price || 0,
        purchasePrice: (createProductDto.price || 0) * 0.7, // Asumsi default
        batchCode: `INITIAL-${Date.now()}`,
        isActive: true,
      });
      await this.stockRepository.save(stock);
    }

    return this.findOne(savedProduct.id);
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
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .orderBy('images.sortOrder', 'ASC');

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
      .addOrderBy('product.name', 'ASC')
      .getManyAndCount();

    // Optimasi N+1: Ambil semua stok untuk produk yang ada dalam list
    const productIds = data.map((p) => p.id);
    let stockMap = {};

    if (productIds.length > 0) {
      const stocks = await this.stockRepository
        .createQueryBuilder('stock')
        .select('stock.productId', 'productId')
        .addSelect('SUM(stock.quantity)', 'totalStock')
        .addSelect('MAX(stock.sellingPrice)', 'price')
        .where('stock.productId IN (:...productIds)', { productIds })
        .andWhere('(stock.expiryDate IS NULL OR stock.expiryDate > CURRENT_DATE())') // Filter expired
        .groupBy('stock.productId')
        .getRawMany<{ productId: string; totalStock: string; price: string }>();

      stockMap = stocks.reduce(
        (acc, curr) => {
          acc[curr.productId] = {
            quantity: parseInt(curr.totalStock),
            price: parseFloat(curr.price) || 0,
          };
          return acc;
        },
        {} as Record<string, { quantity: number; price: number }>,
      );
    }

    const enhancedData = data.map((product) => {
      const stockInfo = (stockMap as Record<string, { quantity: number; price: number }>)[
        product.id
      ] || { quantity: 0, price: 0 };
      return {
        ...product,
        stockQuantity: stockInfo.quantity,
        price: stockInfo.price,
      };
    });

    return {
      data: enhancedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTopSelling(startDate?: Date, endDate?: Date, limit: number = 10) {
    try {
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
        const endDateCopy = new Date(endDate);
        endDateCopy.setHours(23, 59, 59, 999);
        query.andWhere('transaction.created_at <= :endDate', {
          endDate: endDateCopy,
        });
      }

      query.andWhere('transaction.status = :status', { status: 'COMPLETED' });

      const results = await query.getRawMany<{
        id: string;
        name: string;
        image: string;
        sold: string;
        revenue: string;
      }>();

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

  async findAllPublic(categoryId?: string, search?: string, page: number = 1, limit: number = 12) {
    return this.findAll(categoryId, search, page, limit, undefined, true);
  }

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
      relations: ['category', 'images'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Ambil harga dari stock
    const latestStock = await this.stockRepository.findOne({
      where: { productId: id },
      order: { createdAt: 'DESC' },
    });

    return {
      ...product,
      price: latestStock?.sellingPrice || 0,
      stockQuantity: undefined, // Will be handled if needed elsewhere
    };
  }

  async getRecommendedProducts(limit: number = 4) {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('transaction_items', 'item', 'item.product_id = product.id')
      .leftJoin('transactions', 'transaction', 'transaction.id = item.transaction_id')
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('product.image_url', 'image')
      .addSelect('COALESCE(SUM(item.quantity), 0)', 'sold')
      .addSelect('COALESCE(SUM(item.subtotal), 0)', 'revenue')
      .where('transaction.status = :status', { status: 'COMPLETED' })
      .groupBy('product.id')
      .orderBy('sold', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: string;
        name: string;
        image: string;
        sold: string;
        revenue: string;
      }>();

    return products.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      sold: parseInt(item.sold) || 0,
      revenue: parseFloat(item.revenue) || 0,
    }));
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

  async update(id: string, updateProductDto: UpdateProductDto, newImageUrls: string[] = []) {
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

    if (newImageUrls.length > 0) {
      product.imageUrl = newImageUrls[0];
    }

    const savedProduct = await this.productRepository.save(product);

    // Sync price ke stock jika diupdate
    if (updateProductDto.price !== undefined) {
      await this.stockRepository.update(
        { productId: id },
        { sellingPrice: updateProductDto.price },
      );
    }

    // Simpan gambar baru ke tabel product_images jika ada
    if (newImageUrls.length > 0) {
      // Hitung sortOrder berikutnya
      const existingCount = await this.productImageRepository.count({
        where: { productId: savedProduct.id },
      });

      const images = newImageUrls.map((url, index) =>
        this.productImageRepository.create({
          productId: savedProduct.id,
          imageUrl: url,
          isPrimary: existingCount === 0 && index === 0,
          sortOrder: existingCount + index,
        }),
      );
      await this.productImageRepository.save(images);
    }

    return this.findOne(savedProduct.id);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return { message: 'Product deleted successfully' };
  }

  // ========== IMAGE MANAGEMENT METHODS ==========

  async removeImage(imageId: string) {
    const image = await this.productImageRepository.findOne({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    const productId = image.productId;
    const wasPrimary = image.isPrimary;

    await this.productImageRepository.remove(image);

    // Jika gambar yang dihapus adalah primary, set gambar pertama sebagai primary
    if (wasPrimary) {
      const firstImage = await this.productImageRepository.findOne({
        where: { productId },
        order: { sortOrder: 'ASC' },
      });

      if (firstImage) {
        firstImage.isPrimary = true;
        await this.productImageRepository.save(firstImage);

        // Update imageUrl di product
        await this.productRepository.update(productId, { imageUrl: firstImage.imageUrl });
      } else {
        // Tidak ada gambar lagi, set imageUrl null
        await this.productRepository.update(productId, { imageUrl: null });
      }
    }

    return { message: 'Image deleted successfully' };
  }

  async setPrimaryImage(productId: string, imageId: string) {
    // Reset semua gambar product menjadi bukan primary
    await this.productImageRepository.update({ productId }, { isPrimary: false });

    // Set gambar yang dipilih sebagai primary
    const image = await this.productImageRepository.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found for this product`);
    }

    image.isPrimary = true;
    await this.productImageRepository.save(image);

    // Update imageUrl di tabel products agar tetap sinkron
    await this.productRepository.update(productId, { imageUrl: image.imageUrl });

    return { message: 'Primary image updated successfully', image };
  }

  async updateImageOrder(productId: string, imageOrders: { id: string; sortOrder: number }[]) {
    if (!imageOrders || imageOrders.length === 0) {
      throw new BadRequestException('imageOrders cannot be empty');
    }

    const updatePromises = imageOrders.map(({ id, sortOrder }) =>
      this.productImageRepository.update({ id, productId }, { sortOrder }),
    );

    await Promise.all(updatePromises);

    return { message: 'Image order updated successfully' };
  }
}
