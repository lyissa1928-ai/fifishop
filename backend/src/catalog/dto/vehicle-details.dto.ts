import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  VehicleCondition,
  VehicleFuel,
  VehicleTransmission,
} from '../../generated/prisma/enums';

export class VehicleDetailsDto {
  @IsString()
  @MaxLength(100)
  brand!: string;

  @IsString()
  @MaxLength(100)
  model!: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileageKm?: number;

  @IsEnum(VehicleFuel)
  fuel!: VehicleFuel;

  @IsEnum(VehicleTransmission)
  transmission!: VehicleTransmission;

  @IsEnum(VehicleCondition)
  condition!: VehicleCondition;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  engine?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  doors?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  seats?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registration?: string;
}
