// backend/src/modules/categories/categories.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const category = this.categoryRepository.create(createCategoryDto);
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Category with this name already exists');
      }
      throw error;
    }
  }

  // ========== MODIFIKASI INI UNTUK PAGINATION & SEARCH ==========
  async findAll(search?: string, page: number = 1, limit: number = 20) {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .loadRelationCountAndMap('category.productCount', 'category.products');

    if (search) {
      query.where(
        'LOWER(category.name) LIKE LOWER(:search) OR LOWER(category.description) LIKE LOWER(:search)',
        {
          search: `%${search}%`,
        },
      );
    }

    const [data, total] = await query
      .orderBy('category.createdAt', 'DESC')
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

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    Object.assign(category, updateCategoryDto);

    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Category with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category.products && category.products.length > 0) {
      throw new ConflictException('Cannot delete category that has products');
    }

    await this.categoryRepository.remove(category);
    return { message: 'Category deleted successfully' };
  }
}
