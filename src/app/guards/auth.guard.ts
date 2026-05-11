import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If the in-memory signal says authenticated but any localStorage key is missing
  // (e.g. manually cleared), silently clear state and go to login.
  if (auth.isAuthenticated() && !auth.hasStoredSession()) {
    auth.logout();
    return router.createUrlTree(['/login']);
  }

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
