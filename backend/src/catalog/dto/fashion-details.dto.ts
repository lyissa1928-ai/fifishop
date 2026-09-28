import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FashionDetailsDto {
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
  fabric?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  care?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  collection?: string;
}
