import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  DeliveryStatus,
  UserRole,
  UserStatus,
} from '../generated/prisma/enums';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { UpdateAssignedDeliveryDto } from './dto/update-assigned-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------
  // PUBLIC
  // ----------------------------------------------------------

  async publicZones() {
    return this.prisma.deliveryZone.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        fee: true,
        freeDeliveryThreshold: true,
        estimatedMinDays: true,
        estimatedMaxDays: true,
      },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async calculateFee(zoneId: string, subtotal: number) {
    if (!Number.isSafeInteger(subtotal) || subtotal < 0) {
      throw new BadRequestException('Sous-total invalide');
    }

    const zone = await this.prisma.deliveryZone.findFirst({
      where: {
        id: zoneId,
        isActive: true,
      },
    });

    if (!zone) {
      throw new NotFoundException('Zone de livraison indisponible');
    }

    let fee = zone.fee;

    if (
      zone.freeDeliveryThreshold !== null &&
      subtotal >= zone.freeDeliveryThreshold
    ) {
      fee = 0;
    }

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      fee,
      currency: 'XOF',
      freeDelivery: fee === 0,
      estimatedMinDays: zone.estimatedMinDays,
      estimatedMaxDays: zone.estimatedMaxDays,
    };
  }

  // ----------------------------------------------------------
  // ADMIN ZONES
  // ----------------------------------------------------------

  async adminZones() {
    return this.prisma.deliveryZone.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async createZone(dto: CreateDeliveryZoneDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Nom de zone obligatoire');
    }

    this.validateEstimatedDays(dto.estimatedMinDays, dto.estimatedMaxDays);

    const slug = this.slugify(name);

    const exists = await this.prisma.deliveryZone.findUnique({
      where: { slug },
    });

    if (exists) {
      throw new ConflictException('Une zone avec ce nom existe dÃ©jÃ ');
    }

    return this.prisma.deliveryZone.create({
      data: {
        name,
        slug,
        fee: dto.fee,
        freeDeliveryThreshold: dto.freeDeliveryThreshold,
        estimatedMinDays: dto.estimatedMinDays,
        estimatedMaxDays: dto.estimatedMaxDays,
        isActive: dto.isActive ?? true,
        position: dto.position ?? 0,
      },
    });
  }

  async updateZone(id: string, dto: UpdateDeliveryZoneDto) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException('Zone de livraison introuvable');
    }

    const minDays = dto.estimatedMinDays ?? zone.estimatedMinDays ?? undefined;

    const maxDays = dto.estimatedMaxDays ?? zone.estimatedMaxDays ?? undefined;

    this.validateEstimatedDays(minDays, maxDays);

    let name: string | undefined;
    let slug: string | undefined;

    if (dto.name !== undefined) {
      name = dto.name.trim();

      if (!name) {
        throw new BadRequestException('Nom de zone obligatoire');
      }

      slug = this.slugify(name);

      const duplicate = await this.prisma.deliveryZone.findFirst({
        where: {
          slug,
          id: {
            not: id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('Une zone avec ce nom existe dÃ©jÃ ');
      }
    }

    return this.prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(name !== undefined && {
          name,
          slug,
        }),

        ...(dto.fee !== undefined && {
          fee: dto.fee,
        }),

        ...(dto.freeDeliveryThreshold !== undefined && {
          freeDeliveryThreshold: dto.freeDeliveryThreshold,
        }),

        ...(dto.estimatedMinDays !== undefined && {
          estimatedMinDays: dto.estimatedMinDays,
        }),

        ...(dto.estimatedMaxDays !== undefined && {
          estimatedMaxDays: dto.estimatedMaxDays,
        }),

        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),

        ...(dto.position !== undefined && {
          position: dto.position,
        }),
      },
    });
  }

  async disableZone(id: string) {
    const zone = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException('Zone de livraison introuvable');
    }

    return this.prisma.deliveryZone.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  // ----------------------------------------------------------
  // ADMIN DELIVERY TRACKING
  // ----------------------------------------------------------

  async updateDelivery(orderNumber: string, dto: UpdateDeliveryDto) {
    const order = await this.prisma.order.findUnique({
      where: {
        orderNumber,
      },
      include: {
        delivery: true,
      },
    });

    if (!order || !order.delivery) {
      throw new NotFoundException('Livraison introuvable');
    }

    const currentStatus = order.delivery.status;

    if (dto.status && !this.canTransition(currentStatus, dto.status)) {
      throw new BadRequestException(
        `Transition de livraison interdite : ${currentStatus} -> ${dto.status}`,
      );
    }

    const now = new Date();

    return this.prisma.delivery.update({
      where: {
        orderId: order.id,
      },
      data: {
        ...(dto.status !== undefined && {
          status: dto.status,
        }),

        ...(dto.carrierName !== undefined && {
          carrierName: dto.carrierName.trim(),
        }),

        ...(dto.trackingCode !== undefined && {
          trackingCode: dto.trackingCode.trim(),
        }),

        ...(dto.scheduledAt !== undefined && {
          scheduledAt: new Date(dto.scheduledAt),
        }),

        ...(dto.notes !== undefined && {
          notes: dto.notes.trim(),
        }),

        ...(dto.status === DeliveryStatus.IN_TRANSIT &&
          !order.delivery.shippedAt && {
            shippedAt: now,
          }),

        ...(dto.status === DeliveryStatus.DELIVERED && {
          deliveredAt: now,
        }),
      },
    });
  }

  // ----------------------------------------------------------
  // ADMIN - AFFECTATION LIVREUR
  // ----------------------------------------------------------

  async assignDeliveryAgent(orderNumber: string, deliveryAgentId: string) {
    const agent = await this.prisma.user.findUnique({
      where: {
        id: deliveryAgentId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Livreur introuvable');
    }

    if (agent.role !== UserRole.DELIVERY_AGENT) {
      throw new BadRequestException('Cet utilisateur nâ€™est pas un livreur');
    }

    if (agent.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Le compte du livreur nâ€™est pas actif');
    }

    const order = await this.prisma.order.findUnique({
      where: {
        orderNumber,
      },
      include: {
        delivery: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    if (!order.delivery) {
      throw new NotFoundException(
        'Aucune livraison associÃ©e Ã  cette commande',
      );
    }

    if (
      order.delivery.status === DeliveryStatus.DELIVERED ||
      order.delivery.status === DeliveryStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Cette livraison est terminÃ©e et ne peut plus Ãªtre affectÃ©e',
      );
    }

    return this.prisma.delivery.update({
      where: {
        id: order.delivery.id,
      },
      data: {
        deliveryAgentId: agent.id,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        deliveryAgent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  // ----------------------------------------------------------
  // DELIVERY AGENT - SES LIVRAISONS UNIQUEMENT
  // ----------------------------------------------------------

  async assignedDeliveries(user: AuthenticatedUser) {
    return this.prisma.delivery.findMany({
      where: {
        deliveryAgentId: user.id,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            subtotal: true,
            deliveryFee: true,
            total: true,
            createdAt: true,
            address: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async assignedDelivery(user: AuthenticatedUser, orderNumber: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        deliveryAgentId: user.id,
        order: {
          orderNumber,
        },
      },
      include: {
        order: {
          include: {
            address: true,
            items: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Livraison introuvable');
    }

    return delivery;
  }

  // ----------------------------------------------------------
  // DELIVERY AGENT - MISE A JOUR DE SA LIVRAISON
  // ----------------------------------------------------------

  async updateAssignedDelivery(
    user: AuthenticatedUser,
    orderNumber: string,
    dto: UpdateAssignedDeliveryDto,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        order: {
          orderNumber,
        },
      },
      include: {
        order: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Livraison introuvable');
    }

    if (delivery.deliveryAgentId !== user.id) {
      throw new ForbiddenException('Cette livraison ne vous est pas affectÃ©e');
    }

    if (dto.status === DeliveryStatus.CANCELLED) {
      throw new ForbiddenException(
        'Un livreur ne peut pas annuler une livraison',
      );
    }

    if (dto.status === DeliveryStatus.PENDING) {
      throw new BadRequestException('Retour au statut PENDING interdit');
    }

    if (!this.canTransition(delivery.status, dto.status)) {
      throw new ConflictException(
        `Transition de livraison interdite : ${delivery.status} -> ${dto.status}`,
      );
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: {
          id: delivery.id,
        },
        data: {
          status: dto.status,

          ...(dto.notes !== undefined && {
            notes: dto.notes.trim(),
          }),

          ...(dto.status === DeliveryStatus.IN_TRANSIT &&
            !delivery.shippedAt && {
              shippedAt: now,
            }),

          ...(dto.status === DeliveryStatus.DELIVERED && {
            deliveredAt: now,
          }),
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
            },
          },
        },
      });

      /*
       * Synchronisation minimale et sÃ»re avec la commande.
       * READY -> IN_TRANSIT  => commande SHIPPED
       * livraison DELIVERED => commande DELIVERED
       *
       * On ne laisse pas le livreur manipuler directement
       * l'API administrative des commandes.
       */

      if (
        dto.status === DeliveryStatus.IN_TRANSIT &&
        delivery.order.status === 'READY'
      ) {
        await tx.order.update({
          where: {
            id: delivery.orderId,
          },
          data: {
            status: 'SHIPPED',
          },
        });
      }

      if (
        dto.status === DeliveryStatus.DELIVERED &&
        (delivery.order.status === 'READY' ||
          delivery.order.status === 'SHIPPED')
      ) {
        await tx.order.update({
          where: {
            id: delivery.orderId,
          },
          data: {
            status: 'DELIVERED',
          },
        });
      }

      return updated;
    });
  }
  private canTransition(
    current: DeliveryStatus,
    next: DeliveryStatus,
  ): boolean {
    if (current === next) {
      return true;
    }

    const transitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      PENDING: [DeliveryStatus.PREPARING, DeliveryStatus.CANCELLED],

      PREPARING: [DeliveryStatus.READY, DeliveryStatus.CANCELLED],

      READY: [
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.CANCELLED,
      ],

      IN_TRANSIT: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],

      DELIVERED: [],

      FAILED: [DeliveryStatus.PREPARING, DeliveryStatus.CANCELLED],

      CANCELLED: [],
    };

    return transitions[current].includes(next);
  }

  private validateEstimatedDays(min?: number, max?: number) {
    if (min !== undefined && max !== undefined && min > max) {
      throw new BadRequestException(
        'Le dÃ©lai minimum ne peut pas dÃ©passer le dÃ©lai maximum',
      );
    }
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
