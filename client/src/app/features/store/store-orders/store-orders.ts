import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import {
  METHOD_LABELS,
  Order,
  OrderState,
  STATE_COLORS,
  STATE_LABELS,
} from '../../../core/models/order.model';

@Component({
  selector: 'app-store-orders',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './store-orders.html',
})
export class StoreOrders implements OnInit {
  private readonly orders = inject(OrderService);

  readonly items = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly filtro = signal('');
  readonly estados: OrderState[] = [
    'pendente',
    'confirmada',
    'em_preparacao',
    'em_entrega',
    'entregue',
    'cancelada',
  ];
  readonly labels = STATE_LABELS;
  readonly colors = STATE_COLORS;
  readonly metodos = METHOD_LABELS;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.orders.listAll(this.filtro() || undefined).subscribe({
      next: (res) => {
        this.items.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filtrar(estado: string): void {
    this.filtro.set(estado);
    this.load();
  }

  /** Próximo estado que a loja pode aplicar (ou null). */
  proximo(o: Order): OrderState | null {
    switch (o.estado) {
      case 'pendente':
        return 'confirmada';
      case 'confirmada':
        return 'em_preparacao';
      case 'em_preparacao':
        return o.metodoEntrega === 'estafeta' ? null : 'em_entrega';
      case 'em_entrega':
        return 'entregue';
      default:
        return null;
    }
  }

  avancar(o: Order): void {
    const proximo = this.proximo(o);
    if (!proximo) return;
    this.orders.setEstado(o._id, proximo).subscribe(() => this.load());
  }

  clienteNome(o: Order): string {
    return typeof o.cliente === 'string' ? o.cliente : o.cliente.nome;
  }
}
