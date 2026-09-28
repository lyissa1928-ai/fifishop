import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryMethod, PaymentMethod } from '../../generated/prisma/enums';

export class CheckoutAddressDto {
  @IsString()
  @MaxLength(150)
  recipient!: string;

  @IsString()
  @MaxLength(50)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}

export class CheckoutDto {
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string;

  @IsString()
  @MaxLength(50)
  phone!: string;

  @IsEnum(PaymentMethod)
  @IsIn([PaymentMethod.CASH_ON_DELIVERY], {
    message:
      'Moyen de paiement indisponible. Seul le paiement à la livraison est actuellement activé.',
  })
  paymentMethod!: PaymentMethod;

  @IsEnum(DeliveryMethod)
  deliveryMethod!: DeliveryMethod;

  /*
   * Obligatoire pour HOME_DELIVERY.
   * Le montant de livraison n'est jamais accepté du frontend.
   */
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  address!: CheckoutAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
