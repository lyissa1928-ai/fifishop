import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { AssignDeliveryAgentDto } from './dto/assign-delivery-agent.dto';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { UpdateAssignedDeliveryDto } from './dto/update-assigned-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { DeliveryService } from './delivery.service';

@Controller()
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  // Public : zones disponibles au checkout
  @Get('delivery/zones')
  zones() {
    return this.service.publicZones();
  }

  // Administration
  @Get('admin/delivery/zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  adminZones() {
    return this.service.adminZones();
  }

  @Post('admin/delivery/zones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  createZone(@Body() dto: CreateDeliveryZoneDto) {
    return this.service.createZone(dto);
  }

  @Patch('admin/delivery/zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateZone(@Param('id') id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.service.updateZone(id, dto);
  }

  @Delete('admin/delivery/zones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  disableZone(@Param('id') id: string) {
    return this.service.disableZone(id);
  }

  @Patch('admin/orders/:orderNumber/delivery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  updateDelivery(
    @Param('orderNumber')
    orderNumber: string,

    @Body()
    dto: UpdateDeliveryDto,
  ) {
    return this.service.updateDelivery(orderNumber, dto);
  }

  // ----------------------------------------------------------
  // ADMIN - AFFECTER UN LIVREUR
  // ----------------------------------------------------------

  @Patch('admin/orders/:orderNumber/delivery/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  assignDeliveryAgent(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: AssignDeliveryAgentDto,
  ) {
    return this.service.assignDeliveryAgent(orderNumber, dto.deliveryAgentId);
  }

  // ----------------------------------------------------------
  // DELIVERY AGENT - SES LIVRAISONS
  // ----------------------------------------------------------

  @Get('delivery-agent/deliveries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_AGENT)
  assignedDeliveries(@CurrentUser() user: AuthenticatedUser) {
    return this.service.assignedDeliveries(user);
  }

  @Get('delivery-agent/deliveries/:orderNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_AGENT)
  assignedDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.service.assignedDelivery(user, orderNumber);
  }

  @Patch('delivery-agent/deliveries/:orderNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERY_AGENT)
  updateAssignedDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
    @Body() dto: UpdateAssignedDeliveryDto,
  ) {
    return this.service.updateAssignedDelivery(user, orderNumber, dto);
  }
}
