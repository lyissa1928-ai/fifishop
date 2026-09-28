import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

interface RequestUser {
  id?: string;
}

interface AuditableRequest {
  method: string;
  originalUrl?: string;
  url?: string;
  ip?: string;
  params?: Record<string, string>;
  user?: RequestUser;
  headers?: Record<string, string | string[] | undefined>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditableRequest>();

    if (!this.mustAudit(request)) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.writeAudit(request, startedAt);
        },
      }),
    );
  }

  private mustAudit(request: AuditableRequest): boolean {
    if (
      request.method !== 'POST' &&
      request.method !== 'PUT' &&
      request.method !== 'PATCH' &&
      request.method !== 'DELETE'
    ) {
      return false;
    }

    const url = request.originalUrl ?? request.url ?? '';

    /*
     * L'inscription et les opérations d'authentification
     * ne sont pas enregistrées ici afin de ne jamais risquer
     * de journaliser des données d'authentification.
     */
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')
    ) {
      return false;
    }

    return true;
  }

  private async writeAudit(
    request: AuditableRequest,
    startedAt: number,
  ): Promise<void> {
    try {
      const url = request.originalUrl ?? request.url ?? '';

      const entityId =
        request.params?.orderNumber ??
        request.params?.id ??
        request.params?.slug ??
        null;

      const userAgentHeader = request.headers?.['user-agent'];

      const userAgent = Array.isArray(userAgentHeader)
        ? userAgentHeader.join(' ')
        : userAgentHeader;

      await this.auditService.log({
        userId: request.user?.id ?? null,
        action: `${request.method} ${url}`,
        entityType: this.resolveEntityType(url),
        entityId,
        ipAddress: request.ip ?? null,
        userAgent: userAgent ?? null,
        metadata: {
          method: request.method,
          path: url,
          durationMs: Date.now() - startedAt,
        },
      });
    } catch {
      /*
       * Une panne du journal d'audit ne doit pas transformer
       * une opération métier déjà réussie en erreur HTTP.
       *
       * L'absence éventuelle d'un audit sera détectable par
       * la supervision applicative.
       */
    }
  }

  private resolveEntityType(url: string): string {
    if (url.includes('/payment')) {
      return 'PAYMENT';
    }

    if (url.includes('/delivery') || url.includes('/delivery-agent')) {
      return 'DELIVERY';
    }

    if (url.includes('/orders') || url.includes('/checkout')) {
      return 'ORDER';
    }

    if (url.includes('/products')) {
      return 'PRODUCT';
    }

    if (url.includes('/categories')) {
      return 'CATEGORY';
    }

    if (url.includes('/users')) {
      return 'USER';
    }

    if (url.includes('/cart')) {
      return 'CART';
    }

    return 'APPLICATION';
  }
}
