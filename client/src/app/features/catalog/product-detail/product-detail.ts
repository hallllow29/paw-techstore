import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';
import { CompareService } from '../../../core/services/compare.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Category, Product } from '../../../core/models/catalog.model';
import {
  DeliveryMethod,
  DeliveryMethodConfig,
  METHOD_LABELS,
} from '../../../core/models/order.model';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './product-detail.html',
})
export class ProductDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly products = inject(ProductService);
  protected readonly compare = inject(CompareService);
  protected readonly cart = inject(CartService);
  protected readonly favorites = inject(FavoriteService);
  protected readonly auth = inject(AuthService);
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);

  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly activeImage = signal('');
  readonly added = signal(false);
  readonly metodos = signal<DeliveryMethodConfig[]>([]);
  readonly specsAbertas = signal(false);
  readonly labelsEntrega = METHOD_LABELS;
  readonly img = imageUrl;

  ngOnInit(): void {
    if (this.auth.token) this.favorites.load();
    this.store
      .get()
      .subscribe((r) => this.metodos.set(r.settings.metodosEntrega.filter((m) => m.ativo)));

    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.products.get(slug).subscribe({
      next: (res) => {
        this.product.set(res.product);
        this.activeImage.set(res.product.imagemDestaque);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  desconto(p: Product): number | null {
    if (!p.precoAntigo || p.precoAntigo <= p.preco) return null;
    return Math.round((1 - p.preco / p.precoAntigo) * 100);
  }

  /** Categoria (objeto populado) ou null. */
  categoria(p: Product): Category | null {
    return p.categoria && typeof p.categoria === 'object' ? p.categoria : null;
  }

  /** Categoria-pai (objeto populado) ou null. */
  categoriaPai(p: Product): Category | null {
    const c = this.categoria(p);
    return c?.parent && typeof c.parent === 'object' ? c.parent : null;
  }

  atributos(p: Product): { chave: string; valor: string }[] {
    return Object.entries(p.atributos ?? {}).map(([chave, valor]) => ({ chave, valor }));
  }

  iconeEntrega(metodo: DeliveryMethod): string {
    if (metodo === 'levantamento_loja') return 'bi-shop';
    if (metodo === 'estafeta') return 'bi-bicycle';
    return 'bi-truck';
  }

  addToCart(p: Product): void {
    if (this.cart.add(p)) {
      this.added.set(true);
      this.toast.success(`"${p.nome}" adicionado ao carrinho`);
      setTimeout(() => this.added.set(false), 2000);
    } else {
      this.toast.error('Não há stock suficiente disponível');
    }
  }
}
