import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CatalogService } from './catalog.service';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ==========================================================
  // IMAGES
  // ==========================================================

  @Get('products/:productId/images')
  getImages(@Param('productId') productId: string) {
    return this.catalogService.getImages(productId);
  }

  @Post('products/:productId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  addImage(
    @Param('productId') productId: string,
    @Body() dto: AddProductImageDto,
  ) {
    return this.catalogService.addImage(productId, dto);
  }

  @Patch('products/:productId/images/:imageId/primary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  setPrimaryImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.catalogService.setPrimaryImage(productId, imageId);
  }

  @Delete('products/:productId/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  deleteImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.catalogService.deleteImage(productId, imageId);
  }

  // ==========================================================
  // VARIANTS
  // ==========================================================

  @Get('products/:productId/variants')
  getVariants(@Param('productId') productId: string) {
    return this.catalogService.getVariants(productId);
  }

  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  createVariant(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.catalogService.createVariant(productId, dto);
  }

  @Patch('products/:productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  updateVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.catalogService.updateVariant(productId, variantId, dto);
  }

  @Delete('products/:productId/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  disableVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.catalogService.disableVariant(productId, variantId);
  }

  // ==========================================================
  // STOCK
  // ==========================================================

  @Post('products/:productId/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  adjustStock(
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.adjustStock(productId, dto, user.id);
  }

  @Get('products/:productId/stock/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  stockHistory(@Param('productId') productId: string) {
    return this.catalogService.stockHistory(productId);
  }
}
