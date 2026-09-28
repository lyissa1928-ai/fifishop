import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../generated/prisma/enums';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key')
    idempotencyKey: string | undefined,
    @Body() dto: CheckoutDto,
  ) {
    return this.service.checkout(user.id, dto, idempotencyKey);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  orders(@CurrentUser() user: AuthenticatedUser) {
    return this.service.customerOrders(user.id);
  }

  @Get('orders/:orderNumber')
  @UseGuards(JwtAuthGuard)
  order(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber')
    orderNumber: string,
  ) {
    return this.service.customerOrder(user.id, orderNumber);
  }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  adminOrders() {
    return this.service.adminOrders();
  }

  @Get('admin/orders/:orderNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  adminOrder(
    @Param('orderNumber')
    orderNumber: string,
  ) {
    return this.service.adminOrder(orderNumber);
  }

  @Patch('admin/orders/:orderNumber/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  updateStatus(
    @Param('orderNumber')
    orderNumber: string,

    @Body()
    dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(orderNumber, dto);
  }
}
