// backend/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

interface RequestWithUser {
  user?: {
    role: UserRole;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Jika tidak ada role yang diperlukan, semua boleh akses
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Kalau user tidak login, return false
    if (!user) {
      throw new ForbiddenException('Anda harus login terlebih dahulu');
    }

    // OWNER bisa akses semuanya
    if (user.role === UserRole.OWNER) {
      return true;
    }

    // Untuk role lainnya, harus cocok persis dengan requiredRoles
    return requiredRoles.includes(user.role);
  }
}
