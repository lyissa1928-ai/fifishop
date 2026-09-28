import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
      return true;
    }

    const cookieToken = request.cookies?.csrf_token as string | undefined;

    const headerValue = request.headers['x-csrf-token'];

    const headerToken = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!cookieToken || !headerToken || typeof headerToken !== 'string') {
      throw new ForbiddenException('Jeton CSRF manquant ou invalide');
    }

    const cookieBuffer = Buffer.from(cookieToken);

    const headerBuffer = Buffer.from(headerToken);

    if (
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw new ForbiddenException('Jeton CSRF manquant ou invalide');
    }

    return true;
  }
}
