// backend/src/modules/transactions/dto/create-transaction.dto.ts
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/transaction.entity';
import { AddToCartDto } from './add-to-cart.dto';

export class CreateTransactionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddToCartDto)
  items: AddToCartDto[];

  // Guest customer info
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsBoolean()
  @IsOptional()
  isGuest?: boolean;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paymentAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  shippingCost?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  // ========== TAMBAHAN UNTUK POS/ONLINE ==========
  @IsString()
  @IsOptional()
  @IsEnum(['ONLINE', 'OFFLINE'])
  orderType?: 'ONLINE' | 'OFFLINE'; // Jenis pesanan
}
