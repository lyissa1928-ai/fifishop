import { Module } from '@nestjs/common';
import { CsrfGuard } from './security/csrf.guard';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { CatalogModule } from './catalog/catalog.module';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './database/database.module';
import { DeliveryModule } from './delivery/delivery.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';

import { AuditInterceptor } from './security/audit.interceptor';
import { AuditService } from './security/audit.service';
@Module({
  imports: [
    PaymentsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    DatabaseModule,
    DeliveryModule,
    AuthModule,
    CartModule,
    OrdersModule,
    UsersModule,
    CatalogModule,
    CategoriesModule,
    ProductsModule,
    HealthModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
