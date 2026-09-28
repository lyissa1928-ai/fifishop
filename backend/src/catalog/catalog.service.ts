import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StockMovementType } from '../generated/prisma/enums';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================
  // IMAGES
  // ==========================================================

  async addImage(productId: string, dto: AddProductImageDto) {
    await this.ensureProduct(productId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productImage.updateMany({
          where: {
            productId,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      const existingCount = await tx.productImage.count({
        where: {
          productId,
        },
      });

      return tx.productImage.create({
        data: {
          productId,
          url: dto.url.trim(),
          altText: dto.altText?.trim(),
          position: dto.position ?? existingCount,
          isPrimary: dto.isPrimary ?? existingCount === 0,
        },
      });
    });
  }

  async getImages(productId: string) {
    await this.ensureProduct(productId);

    return this.prisma.productImage.findMany({
      where: {
        productId,
      },
      orderBy: [
        {
          isPrimary: 'desc',
        },
        {
          position: 'asc',
        },
      ],
    });
  }

  async setPrimaryImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new NotFoundException('Image introuvable');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: {
          productId,
        },
        data: {
          isPrimary: false,
        },
      });

      return tx.productImage.update({
        where: {
          id: imageId,
        },
        data: {
          isPrimary: true,
        },
      });
    });
  }

  async deleteImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new NotFoundException('Image introuvable');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({
        where: {
          id: imageId,
        },
      });

      if (image.isPrimary) {
        const nextImage = await tx.productImage.findFirst({
          where: {
            productId,
          },
          orderBy: {
            position: 'asc',
          },
        });

        if (nextImage) {
          await tx.productImage.update({
            where: {
              id: nextImage.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }
      }

      return {
        success: true,
      };
    });
  }

  // ==========================================================
  // VARIANTS
  // ==========================================================

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.ensureProduct(productId);

    const sku = dto.sku.trim().toUpperCase();

    const existing = await this.prisma.productVariant.findUnique({
      where: {
        sku,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Une variante avec ce SKU existe dÃ©jÃ ');
    }

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku,
          name: dto.name?.trim(),
          size: dto.size?.trim(),
          color: dto.color?.trim(),
          material: dto.material?.trim(),
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          stockQuantity: dto.stockQuantity ?? 0,
          lowStockLevel: dto.lowStockLevel ?? 5,
          isActive: dto.isActive ?? true,
        },
      });

      if ((dto.stockQuantity ?? 0) > 0) {
        await tx.stockMovement.create({
          data: {
            productId,
            variantId: variant.id,
            type: StockMovementType.INITIAL,
            quantity: dto.stockQuantity ?? 0,
            previousQuantity: 0,
            newQuantity: dto.stockQuantity ?? 0,
            reason: 'Stock initial variante',
          },
        });
      }

      return variant;
    });
  }

  async getVariants(productId: string) {
    await this.ensureProduct(productId);

    return this.prisma.productVariant.findMany({
      where: {
        productId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const variant = await this.ensureVariant(productId, variantId);

    if (dto.sku) {
      const sku = dto.sku.trim().toUpperCase();

      const existing = await this.prisma.productVariant.findFirst({
        where: {
          sku,
          NOT: {
            id: variantId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        throw new ConflictException('Une variante avec ce SKU existe dÃ©jÃ ');
      }
    }

    // Les changements de stock ne passent jamais par PATCH variant.
    // Ils doivent obligatoirement passer par adjustStock()
    // afin de conserver une trace complÃ¨te.
    if (
      dto.stockQuantity !== undefined &&
      dto.stockQuantity !== Number(variant.stockQuantity)
    ) {
      throw new BadRequestException(
        'Le stock doit Ãªtre modifiÃ© via le module de mouvements de stock',
      );
    }

    return this.prisma.productVariant.update({
      where: {
        id: variantId,
      },
      data: {
        ...(dto.sku !== undefined && {
          sku: dto.sku.trim().toUpperCase(),
        }),

        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),

        ...(dto.size !== undefined && {
          size: dto.size.trim(),
        }),

        ...(dto.color !== undefined && {
          color: dto.color.trim(),
        }),

        ...(dto.material !== undefined && {
          material: dto.material.trim(),
        }),

        ...(dto.price !== undefined && {
          price: dto.price,
        }),

        ...(dto.compareAtPrice !== undefined && {
          compareAtPrice: dto.compareAtPrice,
        }),

        ...(dto.lowStockLevel !== undefined && {
          lowStockLevel: dto.lowStockLevel,
        }),

        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
      },
    });
  }

  async disableVariant(productId: string, variantId: string) {
    await this.ensureVariant(productId, variantId);

    return this.prisma.productVariant.update({
      where: {
        id: variantId,
      },
      data: {
        isActive: false,
      },
    });
  }

  // ==========================================================
  // STOCK
  // ==========================================================

  async adjustStock(
    productId: string,
    dto: AdjustStockDto,
    performedBy: string,
  ) {
    const product = await this.ensureProduct(productId);

    if (!product.trackStock) {
      throw new BadRequestException(
        'Le suivi du stock est dÃ©sactivÃ© pour ce produit',
      );
    }

    if (dto.variantId) {
      return this.adjustVariantStock(productId, dto, performedBy);
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          stockQuantity: true,
        },
      });

      if (!current) {
        throw new NotFoundException('Produit introuvable');
      }

      const previousQuantity = current.stockQuantity;

      const newQuantity = this.calculateNewStock(
        Number(previousQuantity),
        dto.quantity,
        dto.type,
      );

      if (newQuantity < 0) {
        throw new BadRequestException(
          'Stock insuffisant pour cette opÃ©ration',
        );
      }

      const updatedProduct = await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          stockQuantity: newQuantity,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: dto.type,
          quantity: dto.quantity,
          previousQuantity,
          newQuantity,
          reason: dto.reason?.trim(),
          reference: dto.reference?.trim(),
          performedBy,
        },
      });

      return {
        product: updatedProduct,
        movement,
      };
    });
  }

  private async adjustVariantStock(
    productId: string,
    dto: AdjustStockDto,
    performedBy: string,
  ) {
    if (!dto.variantId) {
      throw new BadRequestException('Identifiant variante manquant');
    }

    const variantId = dto.variantId;

    await this.ensureVariant(productId, variantId);

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: {
          id: variantId,
        },
        select: {
          stockQuantity: true,
        },
      });

      if (!variant) {
        throw new NotFoundException('Variante introuvable');
      }

      const previousQuantity = variant.stockQuantity;

      const newQuantity = this.calculateNewStock(
        Number(previousQuantity),
        dto.quantity,
        dto.type,
      );

      if (newQuantity < 0) {
        throw new BadRequestException('Stock insuffisant pour cette variante');
      }

      const updatedVariant = await tx.productVariant.update({
        where: {
          id: variantId,
        },
        data: {
          stockQuantity: newQuantity,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          variantId,
          type: dto.type,
          quantity: dto.quantity,
          previousQuantity,
          newQuantity,
          reason: dto.reason?.trim(),
          reference: dto.reference?.trim(),
          performedBy,
        },
      });

      return {
        variant: updatedVariant,
        movement,
      };
    });
  }

  async stockHistory(productId: string) {
    await this.ensureProduct(productId);

    return this.prisma.stockMovement.findMany({
      where: {
        productId,
      },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
            size: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private calculateNewStock(
    current: number,
    quantity: number,
    type: StockMovementType,
  ): number {
    switch (type) {
      case StockMovementType.INITIAL:
      case StockMovementType.PURCHASE:
      case StockMovementType.RETURN:
      case StockMovementType.ADJUSTMENT_IN:
      case StockMovementType.CANCELLED_ORDER:
        return current + quantity;

      case StockMovementType.SALE:
      case StockMovementType.ADJUSTMENT_OUT:
      case StockMovementType.DAMAGED:
        return current - quantity;

      default:
        throw new BadRequestException(
          'Type de mouvement de stock non pris en charge',
        );
    }
  }

  private async ensureProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product || product.archivedAt) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  private async ensureVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
    });

    if (!variant) {
      throw new NotFoundException('Variante introuvable');
    }

    return variant;
  }
}
