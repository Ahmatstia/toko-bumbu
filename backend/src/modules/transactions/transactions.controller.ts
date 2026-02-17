import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerJwtGuard } from '../customers/auth/guards/customer-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  TransactionStatus,
  PaymentMethod,
} from './entities/transaction.entity';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Endpoint untuk KASIR (pake token admin)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async create(
    @Request() req,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    const userId = req.user?.id;
    return this.transactionsService.create(createTransactionDto, userId);
  }

  // Endpoint untuk CUSTOMER yang login
  @Post('customer')
  @UseGuards(CustomerJwtGuard)
  async createAsCustomer(
    @Request() req,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    // Set customer info dari token
    createTransactionDto.customerId = req.user.id; // <-- PASTIKAN INI ADA
    createTransactionDto.customerName = req.user.name;
    createTransactionDto.customerPhone = req.user.phone;
    createTransactionDto.isGuest = false;

    return this.transactionsService.create(createTransactionDto, undefined);
  }

  // Endpoint untuk customer lihat history transaksi sendiri
  @Get('customer/history')
  @UseGuards(CustomerJwtGuard)
  async getCustomerTransactions(@Request() req) {
    return this.transactionsService.findByCustomer(req.user.id);
  }

  // Endpoint untuk admin lihat semua transaksi
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

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.transactionsService.cancel(id, reason);
  }
}
