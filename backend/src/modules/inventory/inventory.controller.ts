import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InventoryType } from './entities/inventory.entity';
import { Public } from '../../common/decorators/public.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('stock/in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async addStock(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.addStock(createInventoryDto);
  }

  @Post('stock/out')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async removeStock(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.addStock({
      ...createInventoryDto,
      type: InventoryType.OUT,
    });
  }

  @Get('stock')
  @Public()
  async getStock(
    @Query('productId') productId?: string,
    @Query('batchCode') batchCode?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('expiringSoon') expiringSoon?: string,
    @Query('days') days?: string,
    @Query('grouped') grouped?: string,
  ) {
    return this.inventoryService.getStock(
      productId,
      batchCode,
      search,
      lowStock === 'true',
      expiringSoon === 'true',
      days ? parseInt(days) : 30,
      grouped === 'true',
    );
  }

  @Get('stock/low')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async getLowStock(@Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStock(threshold ? parseInt(threshold) : 5);
  }

  @Get('stock/expiring')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async getExpiringSoon(@Query('days') days?: string) {
    return this.inventoryService.getExpiringSoon(days ? parseInt(days) : 30);
  }

  @Post('check-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async checkExpired() {
    return this.inventoryService.checkExpiredProducts();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getHistory(
    @Query('productId') productId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getInventoryHistory(
      productId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
