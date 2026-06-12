import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config';
import { Notification } from '../models/notification.model';

interface NotificationsResponse {
  success: boolean;
  naoLidas: number;
  notifications: Notification[];
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  readonly notifications = signal<Notification[]>([]);
  readonly naoLidas = signal(0);

  /** Carrega as notificações do utilizador autenticado. */
  carregar(): void {
    this.http.get<NotificationsResponse>(`${API_URL}/notifications`).subscribe((r) => {
      this.notifications.set(r.notifications);
      this.naoLidas.set(r.naoLidas);
    });
  }

  marcarLida(id: string): void {
    this.http.patch(`${API_URL}/notifications/${id}/lida`, {}).subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => (n._id === id ? { ...n, lida: true } : n)),
      );
      this.naoLidas.update((c) => Math.max(0, c - 1));
    });
  }

  marcarTodasLidas(): void {
    this.http.patch(`${API_URL}/notifications/ler-todas`, {}).subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, lida: true })));
      this.naoLidas.set(0);
    });
  }

  /** Limpa o estado local (ex.: ao terminar sessão). */
  limpar(): void {
    this.notifications.set([]);
    this.naoLidas.set(0);
  }
}
