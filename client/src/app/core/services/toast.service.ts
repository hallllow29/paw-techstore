import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'danger' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private counter = 0;

  show(message: string, type: ToastType = 'info', timeout = 3500): void {
    const id = ++this.counter;
    this._toasts.update((list) => [...list, { id, message, type }]);
    setTimeout(() => this.remove(id), timeout);
  }

  success(message: string): void {
    this.show(message, 'success');
  }
  error(message: string): void {
    this.show(message, 'danger', 5000);
  }
  info(message: string): void {
    this.show(message, 'info');
  }

  remove(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
