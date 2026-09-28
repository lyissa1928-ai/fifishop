import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[A-Z]/, {
    message: 'Le mot de passe doit contenir une majuscule',
  })
  @Matches(/[a-z]/, {
    message: 'Le mot de passe doit contenir une minuscule',
  })
  @Matches(/[0-9]/, {
    message: 'Le mot de passe doit contenir un chiffre',
  })
  password!: string;
}
