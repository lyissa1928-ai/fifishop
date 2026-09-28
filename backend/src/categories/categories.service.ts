import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = this.normalizeSlug(dto.slug);

    const existing = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Une catÃ©gorie avec ce slug existe dÃ©jÃ ');
    }

    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        parentId: dto.parentId || null,
        isActive: dto.active ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
      },
      include: {
        children: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findAdmin() {
    return this.prisma.category.findMany({
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: {
        slug: this.normalizeSlug(slug),
      },
      include: {
        children: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('CatÃ©gorie introuvable');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const current = await this.ensureCategoryExists(id);

    if (dto.parentId === id) {
      throw new ConflictException(
        'Une catÃ©gorie ne peut pas Ãªtre son propre parent',
      );
    }

    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId);
    }

    let slug = current.slug;

    if (dto.slug) {
      slug = this.normalizeSlug(dto.slug);

      const existing = await this.prisma.category.findFirst({
        where: {
          slug,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        throw new ConflictException(
          'Une catÃ©gorie avec ce slug existe dÃ©jÃ ',
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),
        ...(dto.slug !== undefined && {
          slug,
        }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.parentId !== undefined && {
          parentId: dto.parentId || null,
        }),
        ...(dto.active !== undefined && {
          isActive: dto.active,
        }),
      },
    });
  }

  async disable(id: string) {
    await this.ensureCategoryExists(id);

    return this.prisma.category.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  private async ensureCategoryExists(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('CatÃ©gorie introuvable');
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
