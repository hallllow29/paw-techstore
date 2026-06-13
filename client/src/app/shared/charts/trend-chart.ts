import { Component, computed, input } from '@angular/core';
import { Ponto } from '../../core/series';

/** Mini gráfico de tendência (área + linha) em SVG puro, responsivo. */
@Component({
  selector: 'app-trend-chart',
  template: `
    @if (geo(); as g) {
      <svg
        [attr.viewBox]="'0 0 ' + g.W + ' ' + g.H"
        preserveAspectRatio="none"
        [style.height.px]="height()"
        style="width: 100%; display: block"
        role="img"
        aria-label="Gráfico de tendência"
      >
        <path [attr.d]="g.area" [attr.fill]="cor()" fill-opacity="0.14" />
        <path
          [attr.d]="g.line"
          fill="none"
          [attr.stroke]="cor()"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
      <div class="d-flex justify-content-between text-muted mt-1" style="font-size: 0.7rem">
        <span>{{ first() }}</span
        ><span>{{ last() }}</span>
      </div>
    } @else {
      <p class="text-muted small mb-0">Sem dados.</p>
    }
  `,
})
export class TrendChart {
  readonly points = input<Ponto[]>([]);
  readonly cor = input('#2563eb');
  readonly height = input(120);

  protected readonly geo = computed(() => {
    const pts = this.points();
    const n = pts.length;
    if (!n) return null;
    const W = 300;
    const H = 100;
    const pad = 8;
    const max = Math.max(1, ...pts.map((p) => p.value));
    const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - pad * 2) + pad);
    const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
    const line = pts
      .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
      .join(' ');
    const base = (H - pad).toFixed(1);
    const area = `${line} L${x(n - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;
    return { line, area, W, H };
  });

  protected first(): string {
    return this.points()[0]?.label ?? '';
  }
  protected last(): string {
    const p = this.points();
    return p.at(-1)?.label ?? '';
  }
}
