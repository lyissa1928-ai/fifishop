import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  DeliveryStatus,
  PaymentMethod,
  PaymentStatus,
} from '../generated/prisma/client';

import { PrismaService } from '../database/prisma.service';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consultation administrative du paiement d'une commande.
   */
  async getAdminPayment(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        orderNumber,
      },

      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentStatus: true,
        createdAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    /*
     * orderId n'est pas unique dans Payment.
     * On utilise donc findFirst().
     */
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      ...order,
      payment,
    };
  }

  /**
   * Confirmation administrative d'un paiement
   * CASH_ON_DELIVERY.
   *
   * Le client ne peut jamais appeler cette opération.
   */
  async updateCashOnDeliveryStatus(
    orderNumber: string,
    dto: UpdatePaymentStatusDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          orderNumber,
        },

        select: {
          id: true,
          orderNumber: true,
          paymentStatus: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Commande introuvable');
      }

      /*
       * On récupère explicitement le paiement
       * CASH_ON_DELIVERY de cette commande.
       *
       * Cela évite de modifier accidentellement
       * une tentative Wave/Orange Money.
       */
      const payment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          method: PaymentMethod.CASH_ON_DELIVERY,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!payment) {
        throw new NotFoundException('Paiement à la livraison introuvable');
      }

      /*
       * Seuls ces états peuvent être appliqués
       * manuellement au paiement à la livraison.
       */
      if (
        dto.status !== PaymentStatus.PAID &&
        dto.status !== PaymentStatus.FAILED &&
        dto.status !== PaymentStatus.CANCELLED
      ) {
        throw new BadRequestException('Statut de paiement non autorisé');
      }

      /*
       * Protection contre une deuxième confirmation.
       */
      if (payment.status === PaymentStatus.PAID) {
        throw new BadRequestException('Ce paiement est déjà confirmé');
      }

      /*
       * Un remboursement est terminal dans
       * ce workflow manuel.
       */
      if (payment.status === PaymentStatus.REFUNDED) {
        throw new BadRequestException(
          'Un paiement remboursé ne peut pas être modifié',
        );
      }

      /*
       * CASH_ON_DELIVERY :
       * on ne marque PAID qu'après livraison effective.
       */
      if (dto.status === PaymentStatus.PAID) {
        const delivery = await tx.delivery.findUnique({
          where: {
            orderId: order.id,
          },

          select: {
            status: true,
          },
        });

        if (!delivery || delivery.status !== DeliveryStatus.DELIVERED) {
          throw new BadRequestException(
            'La commande doit être livrée avant de confirmer le paiement',
          );
        }
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: dto.status,

          paidAt: dto.status === PaymentStatus.PAID ? new Date() : null,
        },
      });

      /*
       * Synchronisation de Order.paymentStatus.
       */
      await tx.order.update({
        where: {
          id: order.id,
        },

        data: {
          paymentStatus: dto.status,
        },
      });

      return {
        orderNumber: order.orderNumber,

        payment: {
          id: updatedPayment.id,
          method: updatedPayment.method,
          status: updatedPayment.status,
          amount: updatedPayment.amount,
          providerTransactionId: updatedPayment.providerTransactionId,
          paidAt: updatedPayment.paidAt,
        },
      };
    });
  }
}
