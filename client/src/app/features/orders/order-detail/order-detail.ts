import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { METHOD_LABELS, Order, STATE_COLORS, STATE_LABELS } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './order-detail.html',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  protected readonly auth = inject(AuthService);

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly labels = STATE_LABELS;
  readonly colors = STATE_COLORS;
  readonly metodos = METHOD_LABELS;

  readonly podeCancelar = computed(() => {
    const o = this.order();
    return (
      o && this.auth.hasRole('cliente') && (o.estado === 'pendente' || o.estado === 'confirmada')
    );
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.orders.get(id).subscribe({
      next: (res) => {
        this.order.set(res.order);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cancelar(): void {
    const o = this.order();
    if (!o) return;
    this.error.set(null);
    this.orders.cancel(o._id).subscribe({
      next: (res) => this.order.set(res.order),
      error: (err) => this.error.set(err?.error?.message ?? 'Não foi possível cancelar'),
    });
  }
}
