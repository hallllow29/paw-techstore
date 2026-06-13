import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { imageUrl } from '../../core/config';

interface TopItem {
  _id: string;
  quantidade: number;
}
interface StatCard {
  icon: string;
  label: string;
  valor: string;
  cor: string;
}
interface Acao {
  label: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly dashboard = inject(DashboardService);
  protected readonly auth = inject(AuthService);
  readonly img = imageUrl;

  readonly data = signal<Record<string, unknown>>({});
  readonly role = signal<string>('');
  readonly loading = signal(true);

  private readonly eurFmt = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  ngOnInit(): void {
    this.dashboard.get().subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.role.set(res.role);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  num(key: string): number {
    return Number(this.data()[key] ?? 0);
  }
  top(key: string): TopItem[] {
    return (this.data()[key] as TopItem[]) ?? [];
  }
  private eur(key: string): string {
    return `${this.eurFmt.format(this.num(key))} €`;
  }

  /** Cartões de estatística para o papel atual. */
  cards(): StatCard[] {
    switch (this.role()) {
      case 'cliente':
        return [
          {
            icon: 'bi-bag-check',
            label: 'Encomendas',
            valor: `${this.num('numEncomendas')}`,
            cor: 'primary',
          },
          {
            icon: 'bi-cash-coin',
            label: 'Total gasto',
            valor: this.eur('totalGasto'),
            cor: 'success',
          },
        ];
      case 'loja':
        return [
          {
            icon: 'bi-receipt',
            label: 'Encomendas',
            valor: `${this.num('numEncomendas')}`,
            cor: 'primary',
          },
          {
            icon: 'bi-graph-up-arrow',
            label: 'Receita',
            valor: this.eur('receita'),
            cor: 'success',
          },
          {
            icon: 'bi-box-seam',
            label: 'Produtos',
            valor: `${this.num('numProdutos')}`,
            cor: 'info',
          },
        ];
      case 'estafeta':
        return [
          {
            icon: 'bi-truck',
            label: 'Entregas feitas',
            valor: `${this.num('numEntregas')}`,
            cor: 'primary',
          },
          {
            icon: 'bi-cash-coin',
            label: 'A receber',
            valor: this.eur('valorAReceber'),
            cor: 'success',
          },
          {
            icon: 'bi-hourglass-split',
            label: 'Em curso',
            valor: `${this.num('entregasEmCurso')}`,
            cor: 'warning',
          },
          {
            icon: 'bi-star-fill',
            label: `Avaliação (${this.num('numAvaliacoes')})`,
            valor: this.num('numAvaliacoes') > 0 ? this.num('avaliacaoMedia').toFixed(1) : '—',
            cor: 'warning',
          },
        ];
      case 'admin':
        return [
          {
            icon: 'bi-people',
            label: 'Utilizadores',
            valor: `${this.num('numUtilizadores')}`,
            cor: 'primary',
          },
          {
            icon: 'bi-receipt',
            label: 'Encomendas',
            valor: `${this.num('totalEncomendas')}`,
            cor: 'info',
          },
          {
            icon: 'bi-hourglass-split',
            label: 'Estafetas pendentes',
            valor: `${this.num('estafetasPendentes')}`,
            cor: 'warning',
          },
        ];
      default:
        return [];
    }
  }

  /** Atalhos rápidos para o papel atual. */
  acoes(): Acao[] {
    switch (this.role()) {
      case 'cliente':
        return [
          { label: 'As minhas encomendas', icon: 'bi-bag', link: '/encomendas' },
          { label: 'Ver produtos', icon: 'bi-grid', link: '/produtos' },
          { label: 'Favoritos', icon: 'bi-heart', link: '/favoritos' },
        ];
      case 'loja':
        return [
          { label: 'Análise da loja', icon: 'bi-bar-chart-line', link: '/loja/analise' },
          { label: 'Gerir produtos', icon: 'bi-box-seam', link: '/loja/produtos' },
          { label: 'Encomendas', icon: 'bi-receipt', link: '/loja/encomendas' },
          { label: 'Cupões', icon: 'bi-tag', link: '/loja/cupoes' },
          { label: 'Definições da loja', icon: 'bi-gear', link: '/loja/config' },
        ];
      case 'estafeta':
        return [{ label: 'Entregas disponíveis', icon: 'bi-truck', link: '/estafeta/entregas' }];
      case 'admin':
        return [
          { label: 'Observabilidade', icon: 'bi-graph-up-arrow', link: '/admin' },
          { label: 'Gerir utilizadores', icon: 'bi-people-fill', link: '/admin/utilizadores' },
          { label: 'Aprovar estafetas', icon: 'bi-person-check', link: '/admin/estafetas' },
        ];
      default:
        return [];
    }
  }

  topProdutos(): TopItem[] {
    return this.role() === 'loja'
      ? this.top('produtosMaisVendidos')
      : this.top('produtosMaisComprados');
  }
}
