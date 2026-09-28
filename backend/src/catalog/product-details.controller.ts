import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FashionDetailsDto } from './dto/fashion-details.dto';
import { FoodDetailsDto } from './dto/food-details.dto';
import { JewelryDetailsDto } from './dto/jewelry-details.dto';
import { ProductSearchDto } from './dto/product-search.dto';
import { ShoeDetailsDto } from './dto/shoe-details.dto';
import { VehicleDetailsDto } from './dto/vehicle-details.dto';
import { ProductDetailsService } from './product-details.service';

@Controller('catalog')
export class ProductDetailsController {
  constructor(private readonly service: ProductDetailsService) {}

  // ----------------------------------------------------------
  // PUBLIC SEARCH
  // ----------------------------------------------------------

  @Get('search')
  search(@Query() query: ProductSearchDto) {
    return this.service.search(query);
  }

  // ----------------------------------------------------------
  // FOOD
  // ----------------------------------------------------------

  @Put('products/:productId/details/food')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  food(@Param('productId') productId: string, @Body() dto: FoodDetailsDto) {
    return this.service.saveFoodDetails(productId, dto);
  }

  // ----------------------------------------------------------
  // FASHION
  // ----------------------------------------------------------

  @Put('products/:productId/details/fashion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  fashion(
    @Param('productId') productId: string,
    @Body() dto: FashionDetailsDto,
  ) {
    return this.service.saveFashionDetails(productId, dto);
  }

  // ----------------------------------------------------------
  // SHOES
  // ----------------------------------------------------------

  @Put('products/:productId/details/shoes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  shoes(@Param('productId') productId: string, @Body() dto: ShoeDetailsDto) {
    return this.service.saveShoeDetails(productId, dto);
  }

  // ----------------------------------------------------------
  // JEWELRY
  // ----------------------------------------------------------

  @Put('products/:productId/details/jewelry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  jewelry(
    @Param('productId') productId: string,
    @Body() dto: JewelryDetailsDto,
  ) {
    return this.service.saveJewelryDetails(productId, dto);
  }

  // ----------------------------------------------------------
  // VEHICLE
  // ----------------------------------------------------------

  @Put('products/:productId/details/vehicle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  vehicle(
    @Param('productId') productId: string,
    @Body() dto: VehicleDetailsDto,
  ) {
    return this.service.saveVehicleDetails(productId, dto);
  }
}
