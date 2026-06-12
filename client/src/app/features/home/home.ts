import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { ProductService } from '../../core/services/product.service';
import { Category, Product } from '../../core/models/catalog.model';
import { categoryIcon } from '../../core/category-icon';
import { imageUrl } from '../../core/config';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './home.html',
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly categoriesSvc = inject(CategoryService);
  private readonly products = inject(ProductService);

  readonly categorias = signal<Category[]>([]);
  readonly destaques = signal<Product[]>([]);
  readonly iconCategoria = categoryIcon;
  readonly img = imageUrl;

  constructor() {
    this.categoriesSvc.list().subscribe((r) => {
      this.categorias.set(r.categories.filter((c) => !c.parent).slice(0, 8));
    });
    this.products.list({ sort: 'recentes', limit: 8 }).subscribe((r) => {
      this.destaques.set(r.products);
    });
  }

  /** Percentagem de desconto face ao preço antigo (ou null). */
  desconto(p: Product): number | null {
    if (!p.precoAntigo || p.precoAntigo <= p.preco) return null;
    return Math.round((1 - p.preco / p.precoAntigo) * 100);
  }
}
