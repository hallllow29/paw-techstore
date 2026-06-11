import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_ORIGIN, TOKEN_KEY } from '../config';
import { AuthService } from '../services/auth.service';

/**
 * Anexa o JWT a cada pedido e trata a expiração da sessão:
 * num 401, faz logout e redireciona para o login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  // Lê direto do storage para evitar dependência circular na construção do service.
  // Só anexa o JWT a pedidos para a nossa API (não a serviços externos como o mapa).
  const token = localStorage.getItem(TOKEN_KEY);
  const request =
    token && req.url.startsWith(API_ORIGIN)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((err) => {
      if (err.status === 401 && auth.isAuthenticated()) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
