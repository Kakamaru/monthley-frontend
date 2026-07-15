import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Mesti log masuk. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/']);
  return false;
};

/** Superadmin sahaja. */
export const superadminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperadmin()) return true;
  router.navigate([auth.isLoggedIn() ? auth.landingRoute() : '/']);
  return false;
};

/** Admin SP sahaja (ada sekurang-kurangnya satu sp_membership). */
export const spAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSpAdmin() || auth.isSuperadmin()) return true;
  router.navigate([auth.isLoggedIn() ? auth.landingRoute() : '/']);
  return false;
};
