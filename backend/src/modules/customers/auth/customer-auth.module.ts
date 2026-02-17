import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthController } from './customer-auth.controller';
import { Customer } from '../entities/customer.entity';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { CustomerLocalStrategy } from './strategies/customer-local.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    PassportModule,
    JwtModule.registerAsync({
      // <-- PASTIKAN INI ADA
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('CUSTOMER_JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('CUSTOMER_JWT_EXPIRES_IN', '30d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerLocalStrategy, CustomerJwtStrategy],
  exports: [CustomerAuthService],
})
export class CustomerAuthModule {}
