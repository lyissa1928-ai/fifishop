import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { UserRole } from '../generated/prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsService } from './payments.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /*
   * Consultation administrative.
   *
   * On n'expose pas cette route au client.
   */
  @Get('admin/orders/:orderNumber/payment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  getPayment(@Param('orderNumber') orderNumber: string) {
    return this.paymentsService.getAdminPayment(orderNumber);
  }

  /*
   * Confirmation manuelle uniquement pour
   * CASH_ON_DELIVERY.
   */
  @Patch('admin/orders/:orderNumber/payment/cash-on-delivery')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  updateCashOnDelivery(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateCashOnDeliveryStatus(orderNumber, dto);
  }
}
