import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CategoryService } from './core/services/category.service';
import { NotificationService } from './core/services/notification.service';
import { ThemeService } from './core/services/theme.service';
import { ToastService } from './core/services/toast.service';
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
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly categoriesSvc = inject(CategoryService);
  private readonly router = inject(Router);

  readonly categorias = signal<Category[]>([]);
  readonly aReenviar = signal(false);
  readonly iconCategoria = categoryIcon;
  readonly img = imageUrl;

  constructor() {
    // Categorias de topo para o mega-menu
    this.categoriesSvc.list().subscribe((r) => {
      this.categorias.set(r.categories.filter((c) => !c.parent));
    });
    // Carrega notificações e liga o canal em tempo real sempre que o
    // utilizador fica autenticado (login ou restauro de sessão)
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.notif.carregar();
        void this.notif.conectar();
      }
    });
  }

  /** Reenvia o email de confirmação da conta. */
  reenviarConfirmacao(): void {
    this.aReenviar.set(true);
    this.auth.resendVerification().subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.aReenviar.set(false);
      },
      error: () => {
        this.toast.error('Não foi possível reenviar. Tenta novamente mais tarde.');
        this.aReenviar.set(false);
      },
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
