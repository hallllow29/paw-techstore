import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { ProductReviewService } from '../../../core/services/product-review.service';
import { CompareService } from '../../../core/services/compare.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoriteService } from '../../../core/services/favorite.service';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Category, Product, ProductReview } from '../../../core/models/catalog.model';
import {
  DeliveryMethod,
  DeliveryMethodConfig,
  METHOD_LABELS,
} from '../../../core/models/order.model';
import { Stars } from '../../../shared/star-rating/star-rating';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule, Stars],
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
  private readonly reviewsSvc = inject(ProductReviewService);
  private readonly toast = inject(ToastService);

  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly activeImage = signal('');
  readonly added = signal(false);
  readonly metodos = signal<DeliveryMethodConfig[]>([]);
  readonly specsAbertas = signal(false);
  readonly labelsEntrega = METHOD_LABELS;
  readonly img = imageUrl;

  // Avaliações
  readonly reviews = signal<ProductReview[]>([]);
  readonly podeAvaliar = signal(false);
  readonly jaAvaliou = signal(false);
  readonly enviandoReview = signal(false);
  readonly reviewError = signal<string | null>(null);
  readonly estrelas = [1, 2, 3, 4, 5];
  protected ratingSel = 0;
  protected comentario = '';

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
        this.carregarAvaliacoes(res.product.slug);
      },
      error: () => this.loading.set(false),
    });
  }

  private carregarAvaliacoes(slug: string): void {
    this.reviewsSvc.list(slug).subscribe((r) => this.reviews.set(r.reviews));
    if (this.auth.hasRole('cliente')) {
      this.reviewsSvc.myStatus(slug).subscribe((s) => {
        this.podeAvaliar.set(s.podeAvaliar);
        this.jaAvaliou.set(s.jaAvaliou);
      });
    }
  }

  avaliar(): void {
    const p = this.product();
    if (!p || this.ratingSel === 0) return;
    this.enviandoReview.set(true);
    this.reviewError.set(null);
    this.reviewsSvc
      .create(p._id, { rating: this.ratingSel, comentario: this.comentario })
      .subscribe({
        next: (res) => {
          this.reviews.update((list) => [res.review, ...list]);
          this.product.update((cur) =>
            cur ? { ...cur, ratingMedia: res.ratingMedia, numAvaliacoes: res.numAvaliacoes } : cur,
          );
          this.podeAvaliar.set(false);
          this.jaAvaliou.set(true);
          this.enviandoReview.set(false);
          this.ratingSel = 0;
          this.comentario = '';
          this.toast.success('Obrigado pela tua avaliação!');
        },
        error: (err) => {
          this.reviewError.set(err?.error?.message ?? 'Não foi possível avaliar');
          this.enviandoReview.set(false);
        },
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
