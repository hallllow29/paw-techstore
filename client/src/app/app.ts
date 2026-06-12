import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CategoryService } from './core/services/category.service';
import { Category } from './core/models/catalog.model';
import { categoryIcon } from './core/category-icon';
import { Toasts } from './shared/toasts/toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Toasts],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly categoriesSvc = inject(CategoryService);
  private readonly router = inject(Router);

  readonly categorias = signal<Category[]>([]);
  readonly iconCategoria = categoryIcon;

  constructor() {
    // Categorias de topo para o mega-menu
    this.categoriesSvc.list().subscribe((r) => {
      this.categorias.set(r.categories.filter((c) => !c.parent));
    });
  }

  pesquisar(termo: string): void {
    const q = termo.trim();
    this.router.navigate(['/produtos'], { queryParams: q ? { q } : {} });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
