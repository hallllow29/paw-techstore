import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../core/services/toast.service';

const ICONS: Record<ToastType, string> = {
  success: 'bi-check-circle',
  danger: 'bi-exclamation-octagon',
  info: 'bi-info-circle',
  warning: 'bi-exclamation-triangle',
};

@Component({
  selector: 'app-toasts',
  template: `
    <div
      class="toast-container position-fixed bottom-0 end-0 p-3"
      style="z-index: 1100"
      aria-live="polite"
      aria-atomic="true"
    >
      @for (t of toast.toasts(); track t.id) {
        <div class="toast show align-items-center text-bg-{{ t.type }} border-0 mb-2">
          <div class="d-flex">
            <div class="toast-body"><i class="bi {{ icon(t.type) }} me-1"></i> {{ t.message }}</div>
            <button
              type="button"
              class="btn-close btn-close-white me-2 m-auto"
              aria-label="Fechar"
              (click)="toast.remove(t.id)"
            ></button>
          </div>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toast = inject(ToastService);

  icon(type: ToastType): string {
    return ICONS[type];
  }
}
