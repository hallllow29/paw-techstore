import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import {
  DeliveryMethodConfig,
  METHOD_LABELS,
  StoreSettings,
} from '../../../core/models/order.model';
import { imageUrl } from '../../../core/config';

@Component({
  selector: 'app-store-settings',
  imports: [FormsModule],
  templateUrl: './store-settings.html',
})
export class StoreSettingsPage implements OnInit {
  private readonly store = inject(StoreService);

  protected model: StoreSettings = { nome: '', logotipo: '', horario: '', metodosEntrega: [] };
  private logoFile: File | null = null;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly labels = METHOD_LABELS;
  img = imageUrl;

  ngOnInit(): void {
    this.store.get().subscribe((res) => {
      this.model = res.settings;
      this.loading.set(false);
    });
  }

  onLogo(event: Event): void {
    this.logoFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  trackMetodo(_i: number, m: DeliveryMethodConfig): string {
    return m.metodo;
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    const fd = new FormData();
    fd.append('nome', this.model.nome);
    fd.append('horario', this.model.horario);
    fd.append('metodosEntrega', JSON.stringify(this.model.metodosEntrega));
    if (this.logoFile) fd.append('logotipo', this.logoFile);

    this.store.update(fd).subscribe({
      next: (res) => {
        this.model = res.settings;
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
