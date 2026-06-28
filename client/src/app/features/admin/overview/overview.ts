import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AnalyticsService, AdminStats } from '../../../core/services/analytics.service';
import { serieDiaria } from '../../../core/series';
import { BarList, BarItem } from '../../../shared/charts/bar-list';
import { TrendChart } from '../../../shared/charts/trend-chart';
import { imageUrl } from '../../../core/config';

const ROLE_LABEL: Record<string, string> = {
  cliente: 'Clientes',
  loja: 'Lojas',
  estafeta: 'Estafetas',
  admin: 'Admins',
};
const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativos',
  pendente: 'Pendentes',
  rejeitado: 'Rejeitados',
  banido: 'Suspensos',
};
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

@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink, DatePipe, BarList, TrendChart],
  templateUrl: './overview.html',
})
export class AdminOverview implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  readonly img = imageUrl;

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);

  private readonly eurFmt = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly serieReceita = computed(() => serieDiaria(this.stats()?.tendencia ?? [], 14, 'total'));
  readonly serieNovos = computed(() =>
    serieDiaria(this.stats()?.novosUtilizadores ?? [], 14, 'contagem'),
  );

  readonly barrasRole = computed<BarItem[]>(() =>
    (this.stats()?.porRole ?? []).map((d) => ({
      label: ROLE_LABEL[d._id ?? ''] ?? d._id ?? '-',
      value: d.total,
    })),
  );
  readonly barrasStatus = computed<BarItem[]>(() =>
    (this.stats()?.porStatus ?? []).map((d) => ({
      label: STATUS_LABEL[d._id ?? ''] ?? d._id ?? '-',
      value: d.total,
    })),
  );
  readonly barrasEstado = computed<BarItem[]>(() =>
    (this.stats()?.porEstado ?? []).map((d) => ({
      label: ESTADO_LABEL[d._id ?? ''] ?? d._id ?? '-',
      value: d.total,
      color: ESTADO_COR[d._id ?? ''],
    })),
  );
  readonly barrasProdutos = computed<BarItem[]>(() =>
    (this.stats()?.topProdutos ?? []).map((p) => ({ label: p._id, value: p.quantidade })),
  );

  ngOnInit(): void {
    this.analytics.admin().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  eur(v: number | undefined): string {
    return `${this.eurFmt.format(v ?? 0)} €`;
  }
  estadoLabel(s: string): string {
    return ESTADO_LABEL[s] ?? s;
  }
}
