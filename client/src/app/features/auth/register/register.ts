import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AddressInput } from '../../../shared/address-input/address-input';
import { PASSWORD_PATTERN, forcaPassword, ForcaPassword } from '../../../core/password-strength';
import { PHONE_PATTERN } from '../../../core/patterns';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AddressInput],
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly forca = signal<ForcaPassword>(forcaPassword(''));

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)],
    ],
    morada: ['', [Validators.required]],
    telefone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    role: ['cliente' as 'cliente' | 'estafeta', [Validators.required]],
  });

  constructor() {
    // Atualiza o medidor de força à medida que a password muda
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.forca.set(forcaPassword(v ?? '')));
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.toast.success(
          'Conta criada! Confirma o teu email (enviámos-te um link) para poderes entrar.',
        );
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Falha no registo');
        this.loading.set(false);
      },
    });
  }
}
