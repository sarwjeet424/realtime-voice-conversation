import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private tokens: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = header.slice('Bearer '.length);
    try {
      const payload = this.tokens.verifyAccessToken(token);
      (req as any).user = payload;
      return true;
    } catch (_e) {
      throw new UnauthorizedException();
    }
  }
}


