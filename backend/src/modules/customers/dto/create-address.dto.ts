import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsString()
  @MaxLength(100)
  recipientName: string;

  @IsString()
  @MaxLength(20)
  recipientPhone: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  postalCode?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
