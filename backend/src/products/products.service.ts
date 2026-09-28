import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    await this.ensureCategory(dto.categoryId);

    const sku = dto.sku.trim().toUpperCase();
    const slug = this.normalizeSlug(dto.slug);

    const duplicate = await this.prisma.product.findFirst({
      where: {
        OR: [{ sku }, { slug }],
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Un produit avec ce SKU ou ce slug existe dÃ©jÃ ',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoryId: dto.categoryId,
          sku,
          slug,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          shortDescription: dto.shortDescription?.trim(),
          type: dto.type,
          status: dto.status ?? 'DRAFT',
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          costPrice: dto.costPrice,
          measurementUnit: dto.measurementUnit,
          trackStock: dto.trackStock ?? true,
          stockQuantity: dto.stockQuantity ?? 0,
          lowStockLevel: dto.lowStockLevel ?? 5,
          featured: dto.featured ?? false,
        },
      });

      if ((dto.stockQuantity ?? 0) > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'INITIAL',
            quantity: dto.stockQuantity ?? 0,
            previousQuantity: 0,
            newQuantity: dto.stockQuantity ?? 0,
            reason: 'Stock initial',
          },
        });
      }

      return product;
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        archivedAt: null,
      },
      select: {
        id: true,
        sku: true,
        slug: true,
        name: true,
        shortDescription: true,
        type: true,
        status: true,
        price: true,
        compareAtPrice: true,
        measurementUnit: true,
        stockQuantity: true,
        featured: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: {
            position: 'asc',
          },
        },
        createdAt: true,
      },
      orderBy: [
        {
          featured: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async findAdmin() {
    return this.prisma.product.findMany({
      where: {
        archivedAt: null,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            position: 'asc',
          },
        },
        variants: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug: this.normalizeSlug(slug),
        status: 'ACTIVE',
        archivedAt: null,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            position: 'asc',
          },
        },
        variants: true,
        foodDetails: true,
        fashionDetails: true,
        shoeDetails: true,
        jewelryDetails: true,
        vehicleDetails: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureProduct(id);

    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }

    if (dto.sku || dto.slug) {
      const conditions: Array<Record<string, string>> = [];

      if (dto.sku) {
        conditions.push({
          sku: dto.sku.trim().toUpperCase(),
        });
      }

      if (dto.slug) {
        conditions.push({
          slug: this.normalizeSlug(dto.slug),
        });
      }

      const duplicate = await this.prisma.product.findFirst({
        where: {
          NOT: {
            id,
          },
          OR: conditions,
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        throw new ConflictException('Ce SKU ou ce slug est dÃ©jÃ  utilisÃ©');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined && {
          categoryId: dto.categoryId,
        }),
        ...(dto.sku !== undefined && {
          sku: dto.sku.trim().toUpperCase(),
        }),
        ...(dto.slug !== undefined && {
          slug: this.normalizeSlug(dto.slug),
        }),
        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.shortDescription !== undefined && {
          shortDescription: dto.shortDescription.trim(),
        }),
        ...(dto.type !== undefined && {
          type: dto.type,
        }),
        ...(dto.status !== undefined && {
          status: dto.status,
        }),
        ...(dto.price !== undefined && {
          price: dto.price,
        }),
        ...(dto.compareAtPrice !== undefined && {
          compareAtPrice: dto.compareAtPrice,
        }),
        ...(dto.costPrice !== undefined && {
          costPrice: dto.costPrice,
        }),
        ...(dto.measurementUnit !== undefined && {
          measurementUnit: dto.measurementUnit,
        }),
        ...(dto.trackStock !== undefined && {
          trackStock: dto.trackStock,
        }),
        ...(dto.lowStockLevel !== undefined && {
          lowStockLevel: dto.lowStockLevel,
        }),
        ...(dto.featured !== undefined && {
          featured: dto.featured,
        }),
      },
    });
  }

  async archive(id: string) {
    await this.ensureProduct(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });
  }

  private async ensureProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        active: true,
      },
    });

    if (!category || !category.active) {
      throw new NotFoundException('CatÃ©gorie inexistante ou inactive');
    }

    return category;
  }

  private normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
