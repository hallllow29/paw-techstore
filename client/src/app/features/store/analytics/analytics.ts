import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService, LojaAnalytics } from '../../../core/services/analytics.service';
import { serieDiaria } from '../../../core/series';
import { BarList, BarItem } from '../../../shared/charts/bar-list';
import { TrendChart } from '../../../shared/charts/trend-chart';

const ESTADO_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  em_preparacao: 'Em preparação',
  em_entrega: 'Em entrega',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};
const ESTADO_COR: Record<string, string> = {
  pendente: '#f59e0b',
  confirmada: '#2563eb',
  em_preparacao: '#06b6d4',
  em_entrega: '#8b5cf6',
  entregue: '#16a34a',
  cancelada: '#ef4444',
};
const PAGAMENTO_LABEL: Record<string, string> = {
  mbway: 'MB WAY',
  multibanco: 'Multibanco',
  cartao: 'Cartão',
  entrega: 'À entrega',
};

@Component({
  selector: 'app-store-analytics',
  imports: [RouterLink, BarList, TrendChart],
  templateUrl: './analytics.html',
})
export class StoreAnalytics implements OnInit {
  private readonly analytics = inject(AnalyticsService);

  readonly data = signal<LojaAnalytics | null>(null);
  readonly loading = signal(true);

  private readonly eurFmt = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly serieReceita = computed(() => serieDiaria(this.data()?.tendencia ?? [], 14, 'total'));

  readonly barrasEstado = computed<BarItem[]>(() =>
    (this.data()?.porEstado ?? []).map((d) => ({
      label: ESTADO_LABEL[d._id ?? ''] ?? d._id ?? '-',
      value: d.total,
      color: ESTADO_COR[d._id ?? ''],
    })),
  );
  readonly barrasProdutos = computed<BarItem[]>(() =>
    (this.data()?.topProdutos ?? []).map((p) => ({ label: p._id, value: p.quantidade })),
  );
  readonly barrasPagamento = computed<BarItem[]>(() =>
    (this.data()?.porPagamento ?? []).map((d) => ({
      label: PAGAMENTO_LABEL[d._id ?? ''] ?? d._id ?? '-',
      value: d.total,
    })),
  );

  ngOnInit(): void {
    this.analytics.loja().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  eur(v: number | undefined): string {
    return `${this.eurFmt.format(v ?? 0)} €`;
  }
}
