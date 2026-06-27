import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OrderService, Courier } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
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
export class StoreOrders implements OnInit, OnDestroy {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly items = signal<Order[]>([]);
  readonly couriers = signal<Courier[]>([]);
  private readonly sel: Record<string, string> = {};
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

  /** Atualiza periodicamente para refletir ações do estafeta/cliente sem F5. */
  private pollId?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.load();
    this.carregarEstafetas();
    this.pollId = setInterval(() => this.load(), 15000);
  }

  ngOnDestroy(): void {
    if (this.pollId) clearInterval(this.pollId);
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

  private carregarEstafetas(): void {
    this.orders.couriers().subscribe((r) => this.couriers.set(r.estafetas));
  }

  setEstafeta(orderId: string, estafetaId: string): void {
    this.sel[orderId] = estafetaId;
  }

  /** A loja atribui a entrega ao estafeta escolhido. */
  atribuir(o: Order): void {
    const estafetaId = this.sel[o._id];
    if (!estafetaId) {
      this.toast.info('Escolhe um estafeta primeiro');
      return;
    }
    this.orders.assign(o._id, estafetaId).subscribe({
      next: () => {
        this.toast.success('Entrega atribuída ao estafeta');
        this.load();
        this.carregarEstafetas();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Não foi possível atribuir'),
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
        // Por estafeta: a loja atribui/aguarda o estafeta (não avança o estado aqui).
        return o.metodoEntrega === 'estafeta' ? null : 'em_entrega';
      case 'em_entrega':
        // Por estafeta: é o estafeta que marca a entrega, não a loja.
        return o.metodoEntrega === 'estafeta' ? null : 'entregue';
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
    const c = o.cliente;
    if (!c) return 'Cliente removido';
    return typeof c === 'string' ? c : c.nome;
  }
}
