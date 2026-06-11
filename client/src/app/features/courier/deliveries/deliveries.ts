import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { Order, STATE_COLORS, STATE_LABELS } from '../../../core/models/order.model';

@Component({
  selector: 'app-deliveries',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './deliveries.html',
})
export class Deliveries implements OnInit {
  private readonly orders = inject(OrderService);

  readonly disponiveis = signal<Order[]>([]);
  readonly minhas = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly labels = STATE_LABELS;
  readonly colors = STATE_COLORS;

  readonly emCurso = computed(() => this.minhas().some((o) => o.estado === 'em_entrega'));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.orders.available().subscribe((res) => this.disponiveis.set(res.orders));
    this.orders.myDeliveries().subscribe({
      next: (res) => {
        this.minhas.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  aceitar(o: Order): void {
    this.error.set(null);
    this.orders.accept(o._id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Não foi possível aceitar'),
    });
  }

  entregar(o: Order): void {
    this.orders.deliver(o._id).subscribe(() => this.load());
  }

  morada(o: Order): string {
    return typeof o.cliente === 'string' ? o.morada : o.cliente.morada || o.morada;
  }
  clienteNome(o: Order): string {
    return typeof o.cliente === 'string' ? '' : o.cliente.nome;
  }
}
