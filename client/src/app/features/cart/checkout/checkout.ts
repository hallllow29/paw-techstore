import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { StoreService } from '../../../core/services/store.service';
import { CouponService } from '../../../core/services/coupon.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DeliveryMethod,
  DeliveryMethodConfig,
  METHOD_LABELS,
} from '../../../core/models/order.model';

@Component({
  selector: 'app-checkout',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly store = inject(StoreService);
  private readonly coupons = inject(CouponService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly metodos = signal<DeliveryMethodConfig[]>([]);
  readonly selecionado = signal<DeliveryMethod | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly labels = METHOD_LABELS;

  // Cupão
  protected codigoCupao = '';
  readonly desconto = signal(0);
  readonly cupaoAplicado = signal<string | null>(null);
  readonly cupaoError = signal<string | null>(null);

  readonly custoEntrega = computed(() => {
    const m = this.metodos().find((x) => x.metodo === this.selecionado());
    return m?.custo ?? 0;
  });
  readonly total = computed(() =>
    Math.max(0, this.cart.subtotal() - this.desconto() + this.custoEntrega()),
  );

  ngOnInit(): void {
    if (this.cart.items().length === 0) {
      this.router.navigate(['/carrinho']);
      return;
    }
    this.store.get().subscribe((res) => {
      const ativos = res.settings.metodosEntrega.filter((m) => m.ativo);
      this.metodos.set(ativos);
      if (ativos.length) this.selecionado.set(ativos[0].metodo);
    });
  }

  aplicarCupao(): void {
    const codigo = this.codigoCupao.trim();
    if (!codigo) return;
    this.cupaoError.set(null);
    this.coupons.validate(codigo, this.cart.subtotal()).subscribe({
      next: (res) => {
        this.desconto.set(res.desconto);
        this.cupaoAplicado.set(res.codigo);
        this.toast.success(`Cupão ${res.codigo} aplicado`);
      },
      error: (err) => {
        this.desconto.set(0);
        this.cupaoAplicado.set(null);
        this.cupaoError.set(err?.error?.message ?? 'Cupão inválido');
      },
    });
  }

  removerCupao(): void {
    this.desconto.set(0);
    this.cupaoAplicado.set(null);
    this.codigoCupao = '';
    this.cupaoError.set(null);
  }

  confirmar(): void {
    const metodo = this.selecionado();
    if (!metodo) return;
    this.loading.set(true);
    this.error.set(null);

    this.orders
      .create(this.cart.toOrderItems(), metodo, this.cupaoAplicado() ?? undefined)
      .subscribe({
        next: (res) => {
          this.cart.clear();
          this.toast.success('Encomenda criada com sucesso!');
          this.router.navigate(['/encomendas', res.order._id]);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Não foi possível criar a encomenda');
          this.loading.set(false);
        },
      });
  }
}
