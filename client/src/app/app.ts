import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CategoryService } from './core/services/category.service';
import { NotificationService } from './core/services/notification.service';
import { Category } from './core/models/catalog.model';
import { categoryIcon } from './core/category-icon';
import { imageUrl } from './core/config';
import { Toasts } from './shared/toasts/toasts';
import { SearchBox } from './shared/search-box/search-box';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, Toasts, SearchBox],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  protected readonly notif = inject(NotificationService);
  private readonly categoriesSvc = inject(CategoryService);
  private readonly router = inject(Router);

  readonly categorias = signal<Category[]>([]);
  readonly iconCategoria = categoryIcon;
  readonly img = imageUrl;

  constructor() {
    // Categorias de topo para o mega-menu
    this.categoriesSvc.list().subscribe((r) => {
      this.categorias.set(r.categories.filter((c) => !c.parent));
    });
    // Carrega notificações sempre que o utilizador fica autenticado (login ou restauro)
    effect(() => {
      if (this.auth.isAuthenticated()) this.notif.carregar();
    });
  }

  /** Clica numa notificação: marca como lida e navega para o destino. */
  abrirNotificacao(id: string, link: string): void {
    this.notif.marcarLida(id);
    if (link) this.router.navigateByUrl(link);
  }

  logout(): void {
    this.auth.logout();
    this.notif.limpar();
    this.router.navigate(['/']);
  }
}
