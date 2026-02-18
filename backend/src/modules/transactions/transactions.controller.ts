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

  // ========== PUBLIC ENDPOINTS ==========

  @Post('guest')
  @Public()
  async createGuest(@Body() createTransactionDto: CreateTransactionDto) {
    createTransactionDto.isGuest = true;
    return this.transactionsService.create(createTransactionDto, undefined);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async create(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    const userId = req.user?.id;
    return this.transactionsService.create(createTransactionDto, userId);
  }

  @Post('customer')
  @UseGuards(CustomerJwtGuard)
  async createAsCustomer(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    createTransactionDto.customerId = req.user.id;
    createTransactionDto.customerName = req.user.name;
    createTransactionDto.customerPhone = req.user.phone;
    createTransactionDto.isGuest = false;

    return this.transactionsService.create(createTransactionDto, undefined);
  }

  // ========== ENDPOINT CEK KETERSEDIAAN STOK ==========
  @Get('availability/:productId')
  @Public()
  async checkAvailability(@Param('productId') productId: string) {
    return this.transactionsService.checkAvailability(productId);
  }

  // ========== PUBLIC CHECK STATUS ==========
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

  // ========== CUSTOMER ENDPOINTS ==========
  @Get('customer/history')
  @UseGuards(CustomerJwtGuard)
  async getCustomerTransactions(@Request() req) {
    return this.transactionsService.findByCustomer(req.user.id);
  }

  // ========== ADMIN ENDPOINTS ==========
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
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

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async updateStatus(@Param('id') id: string, @Body('status') status: TransactionStatus) {
    return this.transactionsService.updateStatus(id, status);
  }

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

  @Get('today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getTodaySales() {
    return this.transactionsService.getTodaySales();
  }

  @Get('invoice/:invoiceNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findByInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.transactionsService.findByInvoice(invoiceNumber);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  // ========== CRON JOB (panggil manual) ==========
  @Post('cron/expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async processExpired() {
    return this.transactionsService.processExpiredReservations();
  }
}
