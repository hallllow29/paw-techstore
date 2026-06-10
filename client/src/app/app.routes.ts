import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'registo',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'admin/estafetas',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/estafetas/estafetas').then((m) => m.Estafetas),
  },
  { path: '**', redirectTo: '' },
];
