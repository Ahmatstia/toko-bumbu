import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AdminCustomersController } from './admin-customers.controller'; // <-- TAMBAHKAN
import { Customer } from './entities/customer.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { CustomerAuthModule } from './auth/customer-auth.module';
import { CustomerAuthController } from './auth/customer-auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerAddress]), CustomerAuthModule],
  controllers: [
    CustomersController,
    CustomerAuthController,
    AdminCustomersController, // <-- TAMBAHKAN
  ],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
