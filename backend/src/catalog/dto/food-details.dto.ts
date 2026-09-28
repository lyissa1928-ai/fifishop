import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class FoodDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  conservation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  preparation?: string;

  @IsOptional()
  @IsBoolean()
  soldByWeight?: boolean;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 3,
  })
  @Min(0)
  minimumOrder?: number;
}
