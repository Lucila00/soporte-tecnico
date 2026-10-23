import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as string[];
  const user = authService.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const userRole = user.role?.name?.toLowerCase() || '';

  if (allowedRoles && allowedRoles.includes(userRole)) {
    return true;
  }

  // Si no tiene el rol, redirige a su panel principal
  router.navigate(['/dashboard']);
  return false;
};
