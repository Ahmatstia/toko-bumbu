import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  @Public()
  async getSummary(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.adminService.getSummary(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('dashboard-stats')
  @Public()
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
}
