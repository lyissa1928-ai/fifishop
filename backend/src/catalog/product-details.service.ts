import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FoodDetailsDto } from './dto/food-details.dto';
import { FashionDetailsDto } from './dto/fashion-details.dto';
import { JewelryDetailsDto } from './dto/jewelry-details.dto';
import { ProductSearchDto } from './dto/product-search.dto';
import { ShoeDetailsDto } from './dto/shoe-details.dto';
import { VehicleDetailsDto } from './dto/vehicle-details.dto';

@Injectable()
export class ProductDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================
  // FOOD
  // ==========================================================

  async saveFoodDetails(productId: string, dto: FoodDetailsDto) {
    const product = await this.ensureProduct(productId);

    if (product.type !== 'FOOD') {
      throw new BadRequestException('Ce produit n’est pas de type FOOD');
    }

    return this.prisma.foodDetails.upsert({
      where: {
        productId,
      },
      create: {
        productId,
        origin: dto.origin?.trim(),
        conservation: dto.conservation?.trim(),
        preparation: dto.preparation?.trim(),
        soldByWeight: dto.soldByWeight ?? false,
        minimumOrder: dto.minimumOrder,
      },
      update: {
        ...(dto.origin !== undefined && {
          origin: dto.origin.trim(),
        }),
        ...(dto.conservation !== undefined && {
          conservation: dto.conservation.trim(),
        }),
        ...(dto.preparation !== undefined && {
          preparation: dto.preparation.trim(),
        }),
        ...(dto.soldByWeight !== undefined && {
          soldByWeight: dto.soldByWeight,
        }),
        ...(dto.minimumOrder !== undefined && {
          minimumOrder: dto.minimumOrder,
        }),
      },
    });
  }

  // ==========================================================
  // FASHION
  // ==========================================================

  async saveFashionDetails(productId: string, dto: FashionDetailsDto) {
    const product = await this.ensureProduct(productId);

    if (product.type !== 'FASHION' && product.type !== 'BAG_ACCESSORY') {
      throw new BadRequestException(
        'Ce produit n’est pas compatible avec les détails mode',
      );
    }

    return this.prisma.fashionDetails.upsert({
      where: {
        productId,
      },
      create: {
        productId,
        gender: dto.gender?.trim(),
        brand: dto.brand?.trim(),
        fabric: dto.fabric?.trim(),
        care: dto.care?.trim(),
        collection: dto.collection?.trim(),
      },
      update: {
        ...(dto.gender !== undefined && {
          gender: dto.gender.trim(),
        }),
        ...(dto.brand !== undefined && {
          brand: dto.brand.trim(),
        }),
        ...(dto.fabric !== undefined && {
          fabric: dto.fabric.trim(),
        }),
        ...(dto.care !== undefined && {
          care: dto.care.trim(),
        }),
        ...(dto.collection !== undefined && {
          collection: dto.collection.trim(),
        }),
      },
    });
  }

  // ==========================================================
  // SHOES
  // ==========================================================

  async saveShoeDetails(productId: string, dto: ShoeDetailsDto) {
    const product = await this.ensureProduct(productId);

    if (product.type !== 'SHOES') {
      throw new BadRequestException('Ce produit n’est pas de type SHOES');
    }

    return this.prisma.shoeDetails.upsert({
      where: {
        productId,
      },
      create: {
        productId,
        gender: dto.gender?.trim(),
        brand: dto.brand?.trim(),
        material: dto.material?.trim(),
        style: dto.style?.trim(),
      },
      update: {
        ...(dto.gender !== undefined && {
          gender: dto.gender.trim(),
        }),
        ...(dto.brand !== undefined && {
          brand: dto.brand.trim(),
        }),
        ...(dto.material !== undefined && {
          material: dto.material.trim(),
        }),
        ...(dto.style !== undefined && {
          style: dto.style.trim(),
        }),
      },
    });
  }

  // ==========================================================
  // JEWELRY
  // ==========================================================

  async saveJewelryDetails(productId: string, dto: JewelryDetailsDto) {
    const product = await this.ensureProduct(productId);

    if (product.type !== 'JEWELRY') {
      throw new BadRequestException('Ce produit n’est pas de type JEWELRY');
    }

    return this.prisma.jewelryDetails.upsert({
      where: {
        productId,
      },
      create: {
        productId,
        jewelryType: dto.jewelryType?.trim(),
        material: dto.material?.trim(),
        stone: dto.stone?.trim(),
        weightGrams: dto.weightGrams,
      },
      update: {
        ...(dto.jewelryType !== undefined && {
          jewelryType: dto.jewelryType.trim(),
        }),
        ...(dto.material !== undefined && {
          material: dto.material.trim(),
        }),
        ...(dto.stone !== undefined && {
          stone: dto.stone.trim(),
        }),
        ...(dto.weightGrams !== undefined && {
          weightGrams: dto.weightGrams,
        }),
      },
    });
  }

  // ==========================================================
  // VEHICLES
  // ==========================================================

  async saveVehicleDetails(productId: string, dto: VehicleDetailsDto) {
    const product = await this.ensureProduct(productId);

    if (product.type !== 'VEHICLE') {
      throw new BadRequestException('Ce produit n’est pas de type VEHICLE');
    }

    return this.prisma.vehicleDetails.upsert({
      where: {
        productId,
      },
      create: {
        productId,
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        year: dto.year,
        mileageKm: dto.mileageKm,
        fuel: dto.fuel,
        transmission: dto.transmission,
        condition: dto.condition,
        color: dto.color?.trim(),
        engine: dto.engine?.trim(),
        doors: dto.doors,
        seats: dto.seats,
        registration: dto.registration?.trim(),
      },
      update: {
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        year: dto.year,
        mileageKm: dto.mileageKm,
        fuel: dto.fuel,
        transmission: dto.transmission,
        condition: dto.condition,
        color: dto.color?.trim(),
        engine: dto.engine?.trim(),
        doors: dto.doors,
        seats: dto.seats,
        registration: dto.registration?.trim(),
      },
    });
  }

  // ==========================================================
  // PUBLIC PRODUCT SEARCH
  // ==========================================================

  async search(dto: ProductSearchDto) {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 24, 100);

    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
      archivedAt: null,
    };

    if (dto.q?.trim()) {
      const q = dto.q.trim();

      where.OR = [
        {
          name: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          shortDescription: {
            contains: q,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (dto.category) {
      where.category = {
        slug: dto.category.trim().toLowerCase(),
        isActive: true,
      };
    }

    if (dto.type) {
      where.type = dto.type;
    }

    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      where.price = {};

      if (dto.minPrice !== undefined) {
        where.price.gte = dto.minPrice;
      }

      if (dto.maxPrice !== undefined) {
        where.price.lte = dto.maxPrice;
      }
    }

    if (dto.size || dto.color) {
      where.variants = {
        some: {
          isActive: true,
          ...(dto.size && {
            size: {
              equals: dto.size,
              mode: 'insensitive',
            },
          }),
          ...(dto.color && {
            color: {
              equals: dto.color,
              mode: 'insensitive',
            },
          }),
        },
      };
    }

    if (dto.brand) {
      const brand = dto.brand.trim();

      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            {
              fashionDetails: {
                is: {
                  brand: {
                    equals: brand,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              shoeDetails: {
                is: {
                  brand: {
                    equals: brand,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              vehicleDetails: {
                is: {
                  brand: {
                    equals: brand,
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        },
      ];
    }

    if (
      dto.fuel ||
      dto.transmission ||
      dto.condition ||
      dto.vehicleYearMin !== undefined ||
      dto.vehicleYearMax !== undefined
    ) {
      const vehicleFilter: any = {};

      if (dto.fuel) {
        vehicleFilter.fuel = dto.fuel;
      }

      if (dto.transmission) {
        vehicleFilter.transmission = dto.transmission;
      }

      if (dto.condition) {
        vehicleFilter.condition = dto.condition;
      }

      if (
        dto.vehicleYearMin !== undefined ||
        dto.vehicleYearMax !== undefined
      ) {
        vehicleFilter.year = {};

        if (dto.vehicleYearMin !== undefined) {
          vehicleFilter.year.gte = dto.vehicleYearMin;
        }

        if (dto.vehicleYearMax !== undefined) {
          vehicleFilter.year.lte = dto.vehicleYearMax;
        }
      }

      where.vehicleDetails = {
        is: vehicleFilter,
      };
    }

    let orderBy: any = {
      createdAt: 'desc',
    };

    if (dto.sort === 'price_asc') {
      orderBy = {
        price: 'asc',
      };
    }

    if (dto.sort === 'price_desc') {
      orderBy = {
        price: 'desc',
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          sku: true,
          slug: true,
          name: true,
          shortDescription: true,
          type: true,
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
            where: {
              isPrimary: true,
            },
            take: 1,
          },

          variants: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              sku: true,
              name: true,
              size: true,
              color: true,
              material: true,
              price: true,
              stockQuantity: true,
            },
          },

          foodDetails: true,
          fashionDetails: true,
          shoeDetails: true,
          jewelryDetails: true,
          vehicleDetails: true,

          createdAt: true,
        },
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private async ensureProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        type: true,
        archivedAt: true,
      },
    });

    if (!product || product.archivedAt) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }
}
