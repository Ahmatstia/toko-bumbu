import {
  Controller,
  Get,
  Query,
  UseGuards,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
    );
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getStats() {
    return this.customersService.getStats();
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.customersService.update(id, updateDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async toggleStatus(@Param('id') id: string) {
    return this.customersService.toggleStatus(id);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
