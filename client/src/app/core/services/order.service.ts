import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { DeliveryMethod, Order, PaymentMethod } from '../models/order.model';

export interface CreateOrderPayload {
  itens: { produto: string; quantidade: number }[];
  metodoEntrega: DeliveryMethod;
  metodoPagamento: PaymentMethod;
  morada?: string;
  guardarMorada?: boolean;
  cupao?: string;
}

interface OrderResponse {
  success: boolean;
  order: Order;
}
interface OrderListResponse {
  success: boolean;
  count: number;
  orders: Order[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  // Cliente
  create(payload: CreateOrderPayload): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${API_URL}/orders`, payload);
  }
  mine(): Observable<OrderListResponse> {
    return this.http.get<OrderListResponse>(`${API_URL}/orders/me`);
  }
  cancel(id: string) {
    return this.http.patch<OrderResponse>(`${API_URL}/orders/${id}/cancelar`, {});
  }
  get(id: string): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${API_URL}/orders/${id}`);
  }

  // Loja
  listAll(estado?: string): Observable<OrderListResponse> {
    const url = estado ? `${API_URL}/orders?estado=${estado}` : `${API_URL}/orders`;
    return this.http.get<OrderListResponse>(url);
  }
  setEstado(id: string, estado: string) {
    return this.http.patch<OrderResponse>(`${API_URL}/orders/${id}/estado`, { estado });
  }

  // Estafeta
  available(): Observable<OrderListResponse> {
    return this.http.get<OrderListResponse>(`${API_URL}/orders/entregas/disponiveis`);
  }
  myDeliveries(): Observable<OrderListResponse> {
    return this.http.get<OrderListResponse>(`${API_URL}/orders/entregas/minhas`);
  }
  accept(id: string) {
    return this.http.patch<OrderResponse>(`${API_URL}/orders/${id}/aceitar`, {});
  }
  deliver(id: string) {
    return this.http.patch<OrderResponse>(`${API_URL}/orders/${id}/entregue`, {});
  }
}
