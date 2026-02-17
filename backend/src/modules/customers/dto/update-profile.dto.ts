import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]+$/, { message: 'Phone number must contain only numbers' })
  phone?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;
}
