import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { CustomerAuthModule } from './auth/customer-auth.module'; // Import module, bukan service
import { CustomerAuthController } from './auth/customer-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerAddress]),
    CustomerAuthModule, // <-- Import module, bukan providers
  ],
  controllers: [CustomersController, CustomerAuthController],
  providers: [CustomersService], // <-- Hanya CustomersService, CustomerAuthService sudah di module
  exports: [CustomersService],
})
export class CustomersModule {}
