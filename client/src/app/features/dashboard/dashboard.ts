import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

interface TopItem {
  _id: string;
  quantidade: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly dashboard = inject(DashboardService);
  protected readonly auth = inject(AuthService);

  readonly data = signal<Record<string, unknown>>({});
  readonly role = signal<string>('');
  readonly loading = signal(true);

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
}
