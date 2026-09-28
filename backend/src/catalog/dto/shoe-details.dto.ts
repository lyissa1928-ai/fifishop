import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShoeDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  material?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  style?: string;
}
