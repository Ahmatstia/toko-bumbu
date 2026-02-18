import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private addressRepository: Repository<CustomerAddress>,
  ) {}

  // ========== METHOD UNTUK CUSTOMER (YANG SUDAH ADA) ==========

  async updateProfile(customerId: string, updateDto: UpdateProfileDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    Object.assign(customer, updateDto);
    await this.customerRepository.save(customer);

    const { password, ...result } = customer;
    return result;
  }

  async getTransactions(customerId: string) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      relations: ['transactions', 'transactions.items', 'transactions.items.product'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer.transactions;
  }

  // Address Management
  async addAddress(customerId: string, createAddressDto: CreateAddressDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (createAddressDto.isDefault) {
      await this.addressRepository.update({ customerId, isDefault: true }, { isDefault: false });
    }

    const address = this.addressRepository.create({
      ...createAddressDto,
      customerId,
    });

    return this.addressRepository.save(address);
  }

  async getAddresses(customerId: string) {
    return this.addressRepository.find({
      where: { customerId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async updateAddress(customerId: string, addressId: string, updateDto: Partial<CreateAddressDto>) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (updateDto.isDefault) {
      await this.addressRepository.update({ customerId, isDefault: true }, { isDefault: false });
    }

    Object.assign(address, updateDto);
    return this.addressRepository.save(address);
  }

  async deleteAddress(customerId: string, addressId: string) {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.addressRepository.remove(address);
    return { message: 'Address deleted successfully' };
  }

  async setDefaultAddress(customerId: string, addressId: string) {
    await this.addressRepository.update({ customerId, isDefault: true }, { isDefault: false });
    await this.addressRepository.update({ id: addressId, customerId }, { isDefault: true });
    return { message: 'Default address updated' };
  }

  // ========== METHOD BARU UNTUK ADMIN ==========

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const where = search
      ? [
          { name: Like(`%${search}%`) },
          { email: Like(`%${search}%`) },
          { phone: Like(`%${search}%`) },
        ]
      : {};

    const [data, total] = await this.customerRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'email', 'phone', 'totalTransactions', 'totalSpent', 'createdAt'], // Jangan include password
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const total = await this.customerRepository.count();
    const active = await this.customerRepository.count({ where: { isActive: true } });

    const totalSpent = await this.customerRepository
      .createQueryBuilder('customer')
      .select('SUM(customer.totalSpent)', 'total')
      .getRawOne();

    return {
      totalCustomers: total,
      activeCustomers: active,
      totalSpent: totalSpent?.total || 0,
    };
  }

  async findOne(id: string) {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['addresses'],
      select: [
        'id',
        'name',
        'email',
        'phone',
        'totalTransactions',
        'totalSpent',
        'createdAt',
        'isActive',
      ],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }
}
