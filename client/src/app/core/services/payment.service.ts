import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  config(): Observable<{ enabled: boolean; paypal: boolean }> {
    return this.http.get<{ enabled: boolean; paypal: boolean }>(`${API_URL}/payments/config`);
  }

  checkout(orderId: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${API_URL}/payments/checkout/${orderId}`, {});
  }

  confirm(sessionId: string): Observable<{ pago: boolean }> {
    return this.http.post<{ pago: boolean }>(`${API_URL}/payments/confirm`, { sessionId });
  }

  mbway(orderId: string, telefone: string): Observable<{ pago: boolean }> {
    return this.http.post<{ pago: boolean }>(`${API_URL}/payments/mbway/${orderId}`, { telefone });
  }

  confirmarMultibanco(orderId: string): Observable<{ pago: boolean }> {
    return this.http.post<{ pago: boolean }>(
      `${API_URL}/payments/multibanco/${orderId}/confirmar`,
      {},
    );
  }

  cartao(orderId: string): Observable<{ pago: boolean }> {
    return this.http.post<{ pago: boolean }>(`${API_URL}/payments/cartao/${orderId}`, {});
  }

  /** PayPal simulado (quando não há credenciais configuradas). */
  paypal(orderId: string): Observable<{ pago: boolean }> {
    return this.http.post<{ pago: boolean }>(`${API_URL}/payments/paypal/${orderId}`, {});
  }

  /** Cria uma ordem PayPal real (sandbox) e devolve a URL de aprovação. */
  createPaypal(orderId: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${API_URL}/payments/paypal/${orderId}/create`, {});
  }

  /** Captura a ordem PayPal no regresso (público). Devolve o id da encomenda. */
  confirmPaypal(paypalOrderId: string): Observable<{ pago: boolean; orderId: string }> {
    return this.http.post<{ pago: boolean; orderId: string }>(
      `${API_URL}/payments/paypal/confirm`,
      { paypalOrderId },
    );
  }
}
