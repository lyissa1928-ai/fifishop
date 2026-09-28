import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                slug: true,
                name: true,
                price: true,
                status: true,
                measurementUnit: true,
                stockQuantity: true,
                trackStock: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                name: true,
                size: true,
                color: true,
                material: true,
                price: true,
                stockQuantity: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!cart) {
      return {
        id: null,
        items: [],
        subtotal: 0,
      };
    }

    let subtotal = 0;

    const items = cart.items.map((item) => {
      const quantity = Number(item.quantity);

      const unitPrice = item.variant?.price ?? item.product.price;

      const lineTotal = Math.round(unitPrice * quantity);

      subtotal += lineTotal;

      return {
        ...item,
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    return {
      id: cart.id,
      items,
      subtotal,
      currency: 'XOF',
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: dto.productId,
      },
      include: {
        variants: dto.variantId
          ? {
              where: {
                id: dto.variantId,
              },
            }
          : false,
      },
    });

    if (!product || product.archivedAt || product.status !== 'ACTIVE') {
      throw new NotFoundException('Produit indisponible');
    }

    let availableStock = product.stockQuantity;

    if (dto.variantId) {
      const variant = product.variants[0];

      if (!variant || !variant.isActive) {
        throw new BadRequestException('Variante invalide ou inactive');
      }

      availableStock = variant.stockQuantity;
    }

    if (product.trackStock && dto.quantity > Number(availableStock)) {
      throw new BadRequestException(
        'QuantitÃ© demandÃ©e supÃ©rieure au stock disponible',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findFirst({
        where: { userId },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: { userId },
        });
      }

      const existing = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
        },
      });

      if (existing) {
        const newQuantity = Number(existing.quantity) + dto.quantity;

        if (product.trackStock && newQuantity > Number(availableStock)) {
          throw new BadRequestException(
            'QuantitÃ© totale supÃ©rieure au stock disponible',
          );
        }

        await tx.cartItem.update({
          where: {
            id: existing.id,
          },
          data: {
            quantity: newQuantity,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            variantId: dto.variantId ?? null,
            quantity: dto.quantity,
          },
        });
      }

      return {
        success: true,
      };
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
      include: {
        product: true,
        variant: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Article du panier introuvable');
    }

    if (item.product.archivedAt || item.product.status !== 'ACTIVE') {
      throw new BadRequestException('Ce produit nâ€™est plus disponible');
    }

    const availableStock = item.variant
      ? item.variant.stockQuantity
      : item.product.stockQuantity;

    if (item.product.trackStock && dto.quantity > Number(availableStock)) {
      throw new BadRequestException('Stock insuffisant');
    }

    await this.prisma.cartItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity: dto.quantity,
      },
    });

    return {
      success: true,
    };
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Article du panier introuvable');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: item.id,
      },
    });

    return {
      success: true,
    };
  }

  async clear(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      return {
        success: true,
      };
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return {
      success: true,
    };
  }
}
