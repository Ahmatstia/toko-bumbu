import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Public } from '../../common/decorators/public.decorator';

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
