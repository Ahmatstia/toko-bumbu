import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsUrl()
  @IsString()
  proofUrl?: string;
}
