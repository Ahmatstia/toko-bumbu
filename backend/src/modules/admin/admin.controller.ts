import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { Public } from '../../common/decorators/public.decorator'; // IMPORT Public decorator

@Controller('admin')
export class AdminController {
  // HAPUS @UseGuards di sini
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  @Public() // TAMBAHKAN Public decorator
  async getSummary() {
    return this.adminService.getSummary();
  }

  // Atau buat endpoint khusus dashboard yang public
  @Get('dashboard-stats')
  @Public()
  async getDashboardStats() {
    return this.adminService.getSummary();
  }
}
