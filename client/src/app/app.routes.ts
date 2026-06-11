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
    path: 'produtos',
    loadComponent: () =>
      import('./features/catalog/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'produtos/:slug',
    loadComponent: () =>
      import('./features/catalog/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'comparar',
    loadComponent: () =>
      import('./features/catalog/comparator/comparator').then((m) => m.Comparator),
  },
  {
    path: 'loja/produtos',
    canActivate: [authGuard, roleGuard(['loja', 'admin'])],
    loadComponent: () =>
      import('./features/store/product-manage/product-manage').then((m) => m.ProductManage),
  },
  {
    path: 'loja/produtos/novo',
    canActivate: [authGuard, roleGuard(['loja', 'admin'])],
    loadComponent: () =>
      import('./features/store/product-form/product-form').then((m) => m.ProductForm),
  },
  {
    path: 'loja/produtos/:id/editar',
    canActivate: [authGuard, roleGuard(['loja', 'admin'])],
    loadComponent: () =>
      import('./features/store/product-form/product-form').then((m) => m.ProductForm),
  },
  {
    path: 'admin/estafetas',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/estafetas/estafetas').then((m) => m.Estafetas),
  },
  { path: '**', redirectTo: '' },
];
