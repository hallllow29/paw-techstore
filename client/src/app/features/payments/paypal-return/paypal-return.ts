import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentService } from '../../../core/services/payment.service';

type Estado = 'a-confirmar' | 'ok' | 'erro';

/**
 * Página pública de regresso do PayPal. Captura o pagamento a partir do id da
 * ordem (?token=...) — funciona mesmo que a sessão não tenha sobrevivido ao
 * redirect externo. Depois encaminha para a encomenda.
 */
@Component({
  selector: 'app-paypal-return',
  imports: [RouterLink],
  templateUrl: './paypal-return.html',
})
export class PaypalReturn implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentService);

  readonly estado = signal<Estado>('a-confirmar');
  readonly orderId = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token'); // id da ordem PayPal
    if (!token) {
      this.estado.set('erro');
      return;
    }
    this.payments.confirmPaypal(token).subscribe({
      next: (r) => {
        this.orderId.set(r.orderId ?? null);
        this.estado.set(r.pago ? 'ok' : 'erro');
      },
      error: () => this.estado.set('erro'),
    });
  }
}
