import { Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

/** Lista de barras horizontais (distribuições, rankings). Sem dependências. */
@Component({
  selector: 'app-bar-list',
  template: `
    @if (items().length) {
      @for (it of items(); track it.label) {
        <div class="mb-2">
          <div class="d-flex justify-content-between align-items-center small mb-1">
            <span class="text-truncate me-2">{{ it.label }}</span>
            <span class="fw-semibold">{{ it.value }}{{ suffix() }}</span>
          </div>
          <div class="barlist-track">
            <div
              class="barlist-fill"
              [style.width.%]="pct(it.value)"
              [style.background]="it.color ?? cor()"
            ></div>
          </div>
        </div>
      }
    } @else {
      <p class="text-muted small mb-0">Sem dados.</p>
    }
  `,
  styles: [
    `
      .barlist-track {
        height: 8px;
        border-radius: 999px;
        background: rgba(127, 127, 127, 0.16);
        overflow: hidden;
      }
      .barlist-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.4s ease;
      }
    `,
  ],
})
export class BarList {
  readonly items = input<BarItem[]>([]);
  readonly suffix = input('');
  readonly cor = input('#2563eb');

  private readonly max = computed(() => Math.max(1, ...this.items().map((i) => i.value)));

  pct(v: number): number {
    return (v / this.max()) * 100;
  }
}
