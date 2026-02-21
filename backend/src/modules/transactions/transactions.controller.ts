import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerJwtGuard } from '../customers/auth/guards/customer-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TransactionStatus, PaymentMethod } from './entities/transaction.entity';
import { Public } from '../../common/decorators/public.decorator';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // ========== PUBLIC ENDPOINTS (Tempatkan PALING ATAS) ==========
  @Get('weekly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getWeeklySales() {
    return this.transactionsService.getWeeklySales();
  }

  @Get('monthly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getMonthlySales() {
    return this.transactionsService.getMonthlySales();
  }

  @Get('daily')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getDailySales(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.transactionsService.getDailySales(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getPaymentMethods() {
    return this.transactionsService.getPaymentMethods();
  }

  @Get('today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getTodaySales() {
    return this.transactionsService.getTodaySales();
  }

  @Get('customer/history')
  @UseGuards(CustomerJwtGuard)
  async getCustomerTransactions(@Request() req) {
    return this.transactionsService.findByCustomer(req.user.id);
  }

  @Get('status/:invoiceNumber')
  @Public()
  async getStatus(@Param('invoiceNumber') invoiceNumber: string) {
    const transaction = await this.transactionsService.findByInvoice(invoiceNumber);
    return {
      invoiceNumber: transaction.invoiceNumber,
      status: transaction.status,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      createdAt: transaction.createdAt,
      expiresAt: transaction.expiresAt,
    };
  }

  @Get('invoice/:invoiceNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findByInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.transactionsService.findByInvoice(invoiceNumber);
  }

  @Get('availability/:productId')
  @Public()
  async checkAvailability(@Param('productId') productId: string) {
    return this.transactionsService.checkAvailability(productId);
  }

  // ========== CREATE ENDPOINTS ==========
  @Post('guest')
  @Public()
  async createGuest(@Body() createTransactionDto: CreateTransactionDto) {
    createTransactionDto.isGuest = true;
    createTransactionDto.orderType = 'ONLINE'; // Force ONLINE for guest
    return this.transactionsService.create(createTransactionDto, undefined);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async create(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    const userId = req.user?.id;
    // Don't force ONLINE here, POS uses default OFFLINE or can specify
    return this.transactionsService.create(createTransactionDto, userId);
  }

  @Post('customer')
  @UseGuards(CustomerJwtGuard)
  async createAsCustomer(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    createTransactionDto.customerId = req.user.id;
    createTransactionDto.customerName = req.user.name;
    createTransactionDto.customerPhone = req.user.phone;
    createTransactionDto.isGuest = false;
    createTransactionDto.orderType = 'ONLINE'; // Force ONLINE for customer

    return this.transactionsService.create(createTransactionDto, undefined);
  }

  // ========== ADMIN ENDPOINTS ==========
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async confirmPayment(@Param('id') id: string, @Request() req) {
    console.log(`🔹 Confirm payment endpoint called for transaction: ${id}`);
    console.log(`🔹 Admin: ${req.user?.id} - ${req.user?.username}`);
    return this.transactionsService.confirmPayment(id, req.user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async cancelTransaction(@Param('id') id: string, @Body('reason') reason: string) {
    return this.transactionsService.cancelTransaction(id, reason);
  }

  @Post(':id/return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async processReturn(@Param('id') id: string, @Body('reason') reason: string, @Request() req) {
    return this.transactionsService.processReturn(id, reason, req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async updateStatus(@Param('id') id: string, @Body('status') status: TransactionStatus) {
    return this.transactionsService.updateStatus(id, status);
  }

  // ========== LIST ENDPOINTS (Tempatkan SETELAH route spesifik) ==========
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: TransactionStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.findAll(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      status,
      paymentMethod,
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ========== DETAIL ENDPOINTS (Tempatkan PALING BAWAH) ==========
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  // ========== CRON JOB ==========
  @Post('cron/expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async processExpired() {
    return this.transactionsService.processExpiredReservations();
  }

  @Post('sync-all-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async syncAllStats() {
    return await this.transactionsService.syncAllCustomerStats();
  }
}
