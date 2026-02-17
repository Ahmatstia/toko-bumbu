import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // Tidak perlu role khusus
    }

    const { user } = context.switchToHttp().getRequest();

    // Kalau user tidak login, return false
    if (!user) return false;

    // OWNER bisa akses semuanya
    if (user.role === UserRole.OWNER) return true;

    // MANAGER bisa akses endpoint yang butuh role MANAGER atau lebih rendah
    if (user.role === UserRole.MANAGER) {
      return (
        requiredRoles.includes(UserRole.MANAGER) ||
        requiredRoles.includes(UserRole.CASHIER) ||
        requiredRoles.includes(UserRole.STAFF)
      );
    }

    // CASHIER dan STAFF cuma bisa akses sesuai role-nya
    return requiredRoles.includes(user.role);
  }
}
