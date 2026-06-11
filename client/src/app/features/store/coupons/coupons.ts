import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CouponService } from '../../../core/services/coupon.service';
import { Coupon } from '../../../core/models/order.model';

@Component({
  selector: 'app-coupons',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './coupons.html',
})
export class Coupons implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly coupons = inject(CouponService);

  readonly items = signal<Coupon[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    tipo: ['percentagem' as 'percentagem' | 'valor', Validators.required],
    valor: [10, [Validators.required, Validators.min(0)]],
    minSubtotal: [0, [Validators.min(0)]],
    validoAte: [''],
    usosMax: [null as number | null],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.coupons.list().subscribe({
      next: (res) => {
        this.items.set(res.coupons);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  criar(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    const v = this.form.getRawValue();
    this.coupons
      .create({
        codigo: v.codigo,
        tipo: v.tipo,
        valor: v.valor,
        minSubtotal: v.minSubtotal,
        validoAte: v.validoAte || null,
        usosMax: v.usosMax || null,
      })
      .subscribe({
        next: () => {
          this.form.reset({ tipo: 'percentagem', valor: 10, minSubtotal: 0 });
          this.load();
        },
        error: (err) => this.error.set(err?.error?.message ?? 'Erro ao criar cupão'),
      });
  }

  toggle(c: Coupon): void {
    this.coupons.update(c._id, { ativo: !c.ativo }).subscribe(() => this.load());
  }

  remover(c: Coupon): void {
    if (!confirm(`Eliminar o cupão ${c.codigo}?`)) return;
    this.coupons.remove(c._id).subscribe(() => this.load());
  }
}
