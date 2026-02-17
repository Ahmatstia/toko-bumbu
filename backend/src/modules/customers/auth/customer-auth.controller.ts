import { Controller, Post, Body, UseGuards, Get, Request, Patch } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { RegisterCustomerDto } from '../dto/register-customer.dto';
import { LoginCustomerDto } from '../dto/login-customer.dto';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CustomerLocalGuard } from './guards/customer-local.guard';

@Controller('customer/auth')
export class CustomerAuthController {
  constructor(
    private customerAuthService: CustomerAuthService, // Hanya ini, hapus CustomersService
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterCustomerDto) {
    return this.customerAuthService.register(registerDto);
  }

  @UseGuards(CustomerLocalGuard)
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginCustomerDto) {
    return this.customerAuthService.login(loginDto);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.customerAuthService.getProfile(req.user.id);
  }
}
