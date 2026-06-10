import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

/** Exige sessão iniciada (existência de token). */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token) return true;
  return router.createUrlTree(['/login']);
};

/** Exige um dos roles indicados. Uso: canActivate: [roleGuard(['admin'])] */
export const roleGuard =
  (roles: Role[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.hasRole(...roles)) return true;
    return router.createUrlTree([auth.token ? '/' : '/login']);
  };
