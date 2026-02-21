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

    const result = { ...customer };
    if ('password' in result) {
      delete (result as Partial<Customer>).password;
    }
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

    const totalSpentResult = (await this.customerRepository
      .createQueryBuilder('customer')
      .select('SUM(customer.totalSpent)', 'total')
      .getRawOne()) as { total: string | null };

    return {
      totalCustomers: total,
      activeCustomers: active,
      totalSpent: parseFloat(totalSpentResult?.total || '0'),
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

  async update(id: string, updateDto: UpdateProfileDto) {
    const customer = await this.findOne(id);
    Object.assign(customer, updateDto);
    return this.customerRepository.save(customer);
  }

  async toggleStatus(id: string) {
    const customer = await this.findOne(id);
    customer.isActive = !customer.isActive;
    return this.customerRepository.save(customer);
  }

  async remove(id: string) {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Secara profesional, kita tidak benar-benar menghapus data jika ada history
    // Tapi dengan Soft Delete, data tetap ada di DB namun tidak muncul di UI.
    return this.customerRepository.softRemove(customer);
  }
}
