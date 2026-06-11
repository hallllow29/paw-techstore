import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  DeliveryMethod,
  DeliveryMethodConfig,
  METHOD_LABELS,
} from '../../../core/models/order.model';

@Component({
  selector: 'app-checkout',
  imports: [DecimalPipe],
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);

  readonly metodos = signal<DeliveryMethodConfig[]>([]);
  readonly selecionado = signal<DeliveryMethod | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly labels = METHOD_LABELS;

  readonly custoEntrega = computed(() => {
    const m = this.metodos().find((x) => x.metodo === this.selecionado());
    return m?.custo ?? 0;
  });
  readonly total = computed(() => this.cart.subtotal() + this.custoEntrega());

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

  confirmar(): void {
    const metodo = this.selecionado();
    if (!metodo) return;
    this.loading.set(true);
    this.error.set(null);

    this.orders.create(this.cart.toOrderItems(), metodo).subscribe({
      next: (res) => {
        this.cart.clear();
        this.router.navigate(['/encomendas', res.order._id]);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Não foi possível criar a encomenda');
        this.loading.set(false);
      },
    });
  }
}
