import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // username for users; email for admin
  role: 'user' | 'admin';
}

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService, private config: ConfigService) {}

  signUserToken(username: string) {
    const payload: JwtPayload = { sub: username, role: 'user' };
    // long-lived token (no explicit expiresIn)
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET_KEY')!,
    });
  }

  signAdminAccessToken(email: string) {
    const payload: JwtPayload = { sub: email, role: 'admin' };
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET_KEY')!,
      expiresIn: '2h',
    });
  }

  signAdminRefreshToken(email: string) {
    const payload: JwtPayload = { sub: email, role: 'admin' };
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('REFRESH_TOKEN_SECRET')!,
      expiresIn: '7d',
    });
  }

  verifyAccessToken(token: string) {
    return this.jwt.verify<JwtPayload>(token, {
      secret: this.config.get<string>('JWT_SECRET_KEY')!,
    });
  }

  verifyRefreshToken(token: string) {
    return this.jwt.verify<JwtPayload>(token, {
      secret: this.config.get<string>('REFRESH_TOKEN_SECRET')!,
    });
  }
}


