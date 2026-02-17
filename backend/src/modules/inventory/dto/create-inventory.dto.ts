import { IsEnum, IsNumber, IsString, IsOptional, IsUUID, Min, IsDateString } from 'class-validator';
import { InventoryType } from '../entities/inventory.entity';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @IsUUID()
  @IsString()
  productId: string;

  @IsEnum(InventoryType)
  type: InventoryType;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  purchasePrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sellingPrice?: number;

  @IsString()
  @IsOptional()
  batchCode?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}
