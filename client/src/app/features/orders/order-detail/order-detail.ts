import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveMap } from '../../../shared/live-map/live-map';
import { OrderService } from '../../../core/services/order.service';
import { ReviewService } from '../../../core/services/review.service';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  METHOD_LABELS,
  Order,
  PAYMENT_LABELS,
  Review,
  STATE_COLORS,
  STATE_LABELS,
} from '../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule, LiveMap],
  templateUrl: './order-detail.html',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly reviews = inject(ReviewService);
  private readonly payments = inject(PaymentService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  readonly stripeAtivo = signal(false);
  readonly paypalAtivo = signal(false);
  readonly pagando = signal(false);

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
  readonly pagamentos = PAYMENT_LABELS;

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

  /** Encomenda ainda por liquidar (e que não é "pagar na entrega"). */
  readonly porPagar = computed(() => {
    const o = this.order();
    return Boolean(
      o &&
      this.auth.hasRole('cliente') &&
      !o.pago &&
      o.metodoPagamento !== 'entrega' &&
      o.estado !== 'cancelada' &&
      o.estado !== 'entregue',
    );
  });

  /** Texto do botão de pagamento conforme o método escolhido na encomenda. */
  readonly textoPagar = computed(() => {
    const o = this.order();
    switch (o?.metodoPagamento) {
      case 'cartao':
        return this.stripeAtivo() ? 'Pagar com cartão (Stripe)' : 'Pagar com cartão';
      case 'mbway':
        return 'Confirmar pagamento MB WAY';
      case 'multibanco':
        return 'Já efetuei o pagamento';
      case 'paypal':
        return 'Pagar com PayPal';
      default:
        return 'Pagar';
    }
  });

  ngOnInit(): void {
    this.payments.config().subscribe((c) => {
      this.stripeAtivo.set(c.enabled);
      this.paypalAtivo.set(c.paypal);
    });
    // Regresso do Stripe (o PayPal usa a página pública /pagamento/paypal).
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.payments.confirm(sessionId).subscribe({
        next: (res) => {
          if (res.pago) this.toast.success('Pagamento confirmado!');
          this.load();
        },
        error: () => this.load(),
      });
    } else {
      this.load();
    }
  }

  /** Conclui o pagamento de acordo com o método registado na encomenda. */
  pagar(): void {
    const o = this.order();
    if (!o) return;
    this.pagando.set(true);
    this.error.set(null);

    const falha = (err: { error?: { message?: string } }) => {
      this.pagando.set(false);
      this.error.set(err?.error?.message ?? 'Não foi possível concluir o pagamento');
    };
    const concluido = () => {
      this.pagando.set(false);
      this.toast.success('Pagamento confirmado!');
      this.load();
    };

    switch (o.metodoPagamento) {
      case 'cartao':
        if (this.stripeAtivo()) {
          this.payments.checkout(o._id).subscribe({
            next: (res) => (globalThis.location.href = res.url),
            error: falha,
          });
        } else {
          this.payments.cartao(o._id).subscribe({ next: concluido, error: falha });
        }
        break;
      case 'mbway':
        this.payments
          .mbway(o._id, this.auth.user()?.telefone ?? '')
          .subscribe({ next: concluido, error: falha });
        break;
      case 'multibanco':
        this.payments.confirmarMultibanco(o._id).subscribe({ next: concluido, error: falha });
        break;
      case 'paypal':
        if (this.paypalAtivo()) {
          this.payments.createPaypal(o._id).subscribe({
            next: (res) => (globalThis.location.href = res.url),
            error: falha,
          });
        } else {
          this.payments.paypal(o._id).subscribe({ next: concluido, error: falha });
        }
        break;
      default:
        this.pagando.set(false);
    }
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

  posicaoInicial(o: Order): { lat: number; lng: number } | null {
    const p = o.ultimaPosicao;
    return p?.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;
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
        next: (res) => {
          this.review.set(res.review);
          this.toast.success('Obrigado pela tua avaliação!');
        },
        error: (err) => this.reviewError.set(err?.error?.message ?? 'Não foi possível avaliar'),
      });
  }

  cancelar(): void {
    const o = this.order();
    if (!o) return;
    this.error.set(null);
    this.orders.cancel(o._id).subscribe({
      next: (res) => {
        this.order.set(res.order);
        this.toast.info('Encomenda cancelada');
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Não foi possível cancelar'),
    });
  }
}
