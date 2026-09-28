import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeliveryStatus } from '../../generated/prisma/enums';

export class UpdateAssignedDeliveryDto {
  @IsEnum(DeliveryStatus)
  status!: DeliveryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
