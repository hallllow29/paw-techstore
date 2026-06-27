import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CategoryService } from './core/services/category.service';
import { NotificationService } from './core/services/notification.service';
import { ThemeService } from './core/services/theme.service';
import { Category } from './core/models/catalog.model';
import { categoryIcon } from './core/category-icon';
import { imageUrl } from './core/config';
import { Toasts } from './shared/toasts/toasts';
import { SearchBox } from './shared/search-box/search-box';
import { OrderService } from './core/services/order.service';

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
  private readonly categoriesSvc = inject(CategoryService);
  private readonly orders = inject(OrderService);
  private readonly router = inject(Router);

  readonly categorias = signal<Category[]>([]);
  readonly iconCategoria = categoryIcon;
  readonly img = imageUrl;

  /** Aviso central ao entrar (loja: novas encomendas; estafeta: novas entregas). */
  readonly workAlert = signal<{
    icon: string;
    title: string;
    message: string;
    button: string;
    route: string;
  } | null>(null);

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
        this.notif.conectar().catch(() => {
          /* ligação em tempo real é best-effort; falha não bloqueia a app */
        });
        this.verificarTarefas();
      }
    });
  }

  /**
   * Mostra um aviso central, uma vez por sessão, quando a loja tem encomendas
   * pendentes ou o estafeta tem entregas disponíveis ao entrar.
   */
  private verificarTarefas(): void {
    const u = this.auth.user();
    if (!u || sessionStorage.getItem('avisoTarefasVisto')) return;

    if (u.role === 'loja') {
      this.orders.listAll('pendente').subscribe({
        next: (r) => {
          if (r.count > 0) {
            this.workAlert.set({
              icon: 'bi-bag-check-fill',
              title: 'Tens novas encomendas!',
              message: `${r.count} encomenda${r.count > 1 ? 's' : ''} à espera de confirmação.`,
              button: 'Ver encomendas',
              route: '/loja/encomendas',
            });
          }
          sessionStorage.setItem('avisoTarefasVisto', '1');
        },
        error: () => sessionStorage.setItem('avisoTarefasVisto', '1'),
      });
    } else if (u.role === 'estafeta') {
      this.orders.available().subscribe({
        next: (r) => {
          if (r.count > 0) {
            this.workAlert.set({
              icon: 'bi-truck',
              title: 'Tens entregas disponíveis!',
              message: `${r.count} entrega${r.count > 1 ? 's' : ''} à tua espera.`,
              button: 'Ver entregas',
              route: '/estafeta/entregas',
            });
          }
          sessionStorage.setItem('avisoTarefasVisto', '1');
        },
        error: () => sessionStorage.setItem('avisoTarefasVisto', '1'),
      });
    }
  }

  /** Vai para a área indicada e fecha o aviso. */
  irParaTarefas(route: string): void {
    this.workAlert.set(null);
    this.router.navigateByUrl(route);
  }

  fecharAviso(): void {
    this.workAlert.set(null);
  }

  /** Clica numa notificação: marca como lida e navega para o destino. */
  abrirNotificacao(id: string, link: string): void {
    this.notif.marcarLida(id);
    if (link) this.router.navigateByUrl(link);
  }

  logout(): void {
    this.auth.logout();
    this.notif.limpar();
    sessionStorage.removeItem('avisoTarefasVisto');
    this.workAlert.set(null);
    this.router.navigate(['/']);
  }
}
