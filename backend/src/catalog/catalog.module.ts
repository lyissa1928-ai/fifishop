import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ProductDetailsController } from './product-details.controller';
import { ProductDetailsService } from './product-details.service';

@Module({
  controllers: [CatalogController, ProductDetailsController],
  providers: [CatalogService, ProductDetailsService],
  exports: [CatalogService, ProductDetailsService],
})
export class CatalogModule {}
