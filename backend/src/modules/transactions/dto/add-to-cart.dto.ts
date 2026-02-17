import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsUUID()
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsUUID()
  @IsOptional()
  @IsString()
  stockId?: string;
}
