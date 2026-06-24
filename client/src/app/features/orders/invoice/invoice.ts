import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { METHOD_LABELS, Order, PAYMENT_LABELS } from '../../../core/models/order.model';

/** Fatura/recibo imprimível de uma encomenda (botão "Imprimir" usa window.print). */
@Component({
  selector: 'app-invoice',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './invoice.html',
})
export class Invoice implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly erro = signal(false);
  readonly pagamentos = PAYMENT_LABELS;
  readonly metodos = METHOD_LABELS;

  readonly ref = computed(() => this.order()?._id.slice(-6).toUpperCase() ?? '');
  readonly cliente = computed(() => {
    const c = this.order()?.cliente;
    return !c || typeof c === 'string' ? null : c;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.erro.set(true);
      this.loading.set(false);
      return;
    }
    this.orders.get(id).subscribe({
      next: (r) => {
        this.order.set(r.order);
        this.loading.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.loading.set(false);
      },
    });
  }

  imprimir(): void {
    globalThis.print();
  }
}
