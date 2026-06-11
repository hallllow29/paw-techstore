import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  METHOD_LABELS,
  Order,
  Review,
  STATE_COLORS,
  STATE_LABELS,
} from '../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './order-detail.html',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly reviews = inject(ReviewService);
  protected readonly auth = inject(AuthService);

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Avaliação
  readonly review = signal<Review | null>(null);
  readonly ratingEncomenda = signal(0);
  readonly ratingEstafeta = signal(0);
  protected comentario = '';
  readonly reviewError = signal<string | null>(null);
  readonly estrelas = [1, 2, 3, 4, 5];

  readonly labels = STATE_LABELS;
  readonly colors = STATE_COLORS;
  readonly metodos = METHOD_LABELS;

  readonly podeCancelar = computed(() => {
    const o = this.order();
    return (
      o && this.auth.hasRole('cliente') && (o.estado === 'pendente' || o.estado === 'confirmada')
    );
  });

  readonly podeAvaliar = computed(() => {
    const o = this.order();
    return o && this.auth.hasRole('cliente') && o.estado === 'entregue' && !this.review();
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
        if (res.order.estado === 'entregue') {
          this.reviews.getByOrder(res.order._id).subscribe((r) => this.review.set(r.review));
        }
      },
      error: () => this.loading.set(false),
    });
  }

  temEstafeta(): boolean {
    return !!this.order()?.estafeta;
  }

  avaliar(): void {
    const o = this.order();
    if (!o || this.ratingEncomenda() === 0) return;
    this.reviewError.set(null);
    this.reviews
      .create({
        orderId: o._id,
        ratingEncomenda: this.ratingEncomenda(),
        ratingEstafeta: this.temEstafeta() ? this.ratingEstafeta() || undefined : undefined,
        comentario: this.comentario,
      })
      .subscribe({
        next: (res) => this.review.set(res.review),
        error: (err) => this.reviewError.set(err?.error?.message ?? 'Não foi possível avaliar'),
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
