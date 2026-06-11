import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { Order, STATE_COLORS, STATE_LABELS } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-list',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './order-list.html',
})
export class OrderList implements OnInit {
  private readonly orders = inject(OrderService);

  readonly items = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly labels = STATE_LABELS;
  readonly colors = STATE_COLORS;

  ngOnInit(): void {
    this.orders.mine().subscribe({
      next: (res) => {
        this.items.set(res.orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
