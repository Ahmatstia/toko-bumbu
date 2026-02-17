import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Unit } from '../entities/product.entity';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  @IsString()
  categoryId: string;

  @IsEnum(Unit)
  unit: Unit;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minStock: number = 5;
}
