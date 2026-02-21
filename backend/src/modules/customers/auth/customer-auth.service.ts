import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Customer } from '../entities/customer.entity';
import { RegisterCustomerDto } from '../dto/register-customer.dto';
import { LoginCustomerDto } from '../dto/login-customer.dto';

export interface ValidatedCustomer {
  id: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  emailVerified: boolean;
  verificationToken: string | null;
  lastLogin: Date | null;
  totalTransactions: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private jwtService: JwtService,
  ) {}

  async validateCustomer(email: string, password: string): Promise<ValidatedCustomer | null> {
    const customer = await this.customerRepository.findOne({
      where: { email, isActive: true },
    });

    if (customer && (await bcrypt.compare(password, customer.password))) {
      const { password: _pw, ...result } = customer;
      void _pw;
      return result as ValidatedCustomer;
    }
    return null;
  }

  async register(registerDto: RegisterCustomerDto) {
    // Cek email sudah terdaftar
    const existingCustomer = await this.customerRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingCustomer) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Buat customer baru
    const customer = this.customerRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      phone: registerDto.phone,
      emailVerified: false,
      verificationToken: Math.random().toString(36).substring(7),
    });

    await this.customerRepository.save(customer);

    const { password: _pw, ...result } = customer;
    void _pw;

    // Generate token
    const token = this.generateToken(customer);

    return {
      customer: result,
      access_token: token,
    };
  }

  async login(loginDto: LoginCustomerDto) {
    const customer = await this.validateCustomer(loginDto.email, loginDto.password);

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.customerRepository.update(customer.id, {
      lastLogin: new Date(),
    });

    const token = this.generateToken(customer);

    return {
      customer,
      access_token: token,
    };
  }

  generateToken(customer: ValidatedCustomer) {
    const payload = {
      sub: customer.id,
      email: customer.email,
      type: 'customer',
    };
    return this.jwtService.sign(payload);
  }

  async getProfile(customerId: string) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      relations: ['addresses'],
    });

    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    const { password: _pw, ...result } = customer;
    void _pw;
    return result;
  }
}
