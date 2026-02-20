// backend/src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';

// Konfigurasi penyimpanan file
const storage = diskStorage({
  destination: './uploads/products',
  filename: (req, file, callback) => {
    const uniqueName = uuidv4();
    const ext = extname(file.originalname);
    callback(null, `${uniqueName}${ext}`);
  },
});

const fileFilter = (req: any, file: any, callback: any) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('top')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getTopProducts(@Query('limit') limit?: string) {
    return this.productsService.getTopProducts(limit ? parseInt(limit) : 5);
  }

  @Get('public')
  @Public()
  async findAllPublic(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAllPublic(
      categoryId,
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 12,
    );
  }

  @Get('top-selling')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getTopSelling(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;
    const limitNum = limit ? parseInt(limit) : 10;

    if (startDateObj && isNaN(startDateObj.getTime())) {
      throw new BadRequestException('Invalid startDate format');
    }
    if (endDateObj && isNaN(endDateObj.getTime())) {
      throw new BadRequestException('Invalid endDate format');
    }

    return this.productsService.getTopSelling(startDateObj, endDateObj, limitNum);
  }

  @Get('all/dropdown')
  @Public()
  async findAllForDropdown() {
    return this.productsService.findAllForDropdown();
  }

  // ========== CREATE dengan Multiple Images ==========
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @UseInterceptors(FilesInterceptor('images', 10, { storage, fileFilter }))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const imageUrls = files?.map((file) => `/uploads/products/${file.filename}`) || [];
    return this.productsService.create(createProductDto, imageUrls);
  }

  // ========== UPDATE dengan Multiple Images ==========
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @UseInterceptors(FilesInterceptor('images', 10, { storage, fileFilter }))
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const imageUrls = files?.map((file) => `/uploads/products/${file.filename}`) || [];
    return this.productsService.update(id, updateProductDto, imageUrls);
  }

  @Get()
  @Public()
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('isPublic') isPublic?: string,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const isPublicBool = isPublic === 'true';

    return this.productsService.findAll(
      categoryId,
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      isActiveBool,
      isPublicBool,
    );
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async removeImage(@Param('imageId') imageId: string) {
    return this.productsService.removeImage(imageId);
  }

  @Post('images/:imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async setPrimaryImage(@Param('imageId') imageId: string, @Body('productId') productId: string) {
    return this.productsService.setPrimaryImage(productId, imageId);
  }

  @Patch('images/order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async updateImageOrder(@Body() body: { productId: string; imageOrders: any[] }) {
    return this.productsService.updateImageOrder(body.productId, body.imageOrders);
  }
}
