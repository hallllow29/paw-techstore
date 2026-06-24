import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CompareService } from '../../../core/services/compare.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { AuthService } from '../../../core/services/auth.service';
import { Category, Pagination, Product, ProductQuery } from '../../../core/models/catalog.model';
import { Stars } from '../../../shared/star-rating/star-rating';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-product-list',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DecimalPipe, Stars],
  templateUrl: './product-list.html',
})
export class ProductList implements OnInit {
  private readonly products = inject(ProductService);
  private readonly categoriesSvc = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  protected readonly compare = inject(CompareService);
  protected readonly favorites = inject(FavoriteService);
  protected readonly auth = inject(AuthService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly items = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly marcas = signal<string[]>([]);
  readonly pagination = signal<Pagination | null>(null);
  readonly loading = signal(false);
  readonly skeletons = Array.from({ length: 8 });

  // Estado de filtros/ordenação/página
  private categoria = '';
  private sort: ProductQuery['sort'] = 'recentes';
  private page = 1;
  // Filtros avançados (ligados por ngModel)
  protected marca = '';
  protected minPreco: number | null = null;
  protected maxPreco: number | null = null;
  protected emStock = false;

  ngOnInit(): void {
    if (this.auth.token) this.favorites.load();
    this.categoriesSvc.list().subscribe((res) => this.categories.set(res.categories));
    this.products.marcas().subscribe((r) => this.marcas.set(r.marcas));

    this.search.valueChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.load();
    });

    // Aplica filtros vindos do URL (mega-menu / mosaico de categorias, pesquisa do header)
    this.route.queryParamMap.subscribe((params) => {
      this.categoria = params.get('categoria') ?? '';
      const q = params.get('q') ?? '';
      if (q !== this.search.value) this.search.setValue(q, { emitEvent: false });
      this.page = 1;
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.products
      .list({
        q: this.search.value,
        categoria: this.categoria,
        marca: this.marca || undefined,
        minPreco: this.minPreco ?? undefined,
        maxPreco: this.maxPreco ?? undefined,
        emStock: this.emStock || undefined,
        sort: this.sort,
        page: this.page,
        limit: 8,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.products);
          this.pagination.set(res.pagination);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onCategoria(value: string): void {
    this.categoria = value;
    this.page = 1;
    this.load();
  }

  onSort(value: string): void {
    this.sort = value as ProductQuery['sort'];
    this.page = 1;
    this.load();
  }

  /** Aplica os filtros avançados (marca, preço, stock). */
  aplicarFiltros(): void {
    this.page = 1;
    this.load();
  }

  limparFiltros(): void {
    this.marca = '';
    this.minPreco = null;
    this.maxPreco = null;
    this.emStock = false;
    this.page = 1;
    this.load();
  }

  temFiltros(): boolean {
    return Boolean(this.marca || this.minPreco != null || this.maxPreco != null || this.emStock);
  }

  goToPage(p: number): void {
    this.page = p;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pages(): number[] {
    const total = this.pagination()?.pages ?? 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  desconto(p: Product): number | null {
    if (!p.precoAntigo || p.precoAntigo <= p.preco) return null;
    return Math.round((1 - p.preco / p.precoAntigo) * 100);
  }

  img = imageUrl;
}
