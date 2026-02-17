import {
  IsNumber,
  IsOptional,
  Min,
  IsDateString,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  purchasePrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sellingPrice?: number;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  batchCode?: string;
}
