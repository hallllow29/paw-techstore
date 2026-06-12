import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-recuperar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar.html',
})
export class Recuperar {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canal = signal<'email' | 'sms'>('email');
  readonly enviado = signal(false);
  readonly devCode = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  pedirCodigo(): void {
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const porSms = this.canal() === 'sms';
    this.auth.forgotPassword(email.value, this.canal()).subscribe({
      next: (res) => {
        this.enviado.set(true);
        this.devCode.set(res.devCode ?? null);
        this.loading.set(false);
        this.toast.info(
          porSms
            ? 'Se a conta existir, enviámos um código por SMS.'
            : 'Se a conta existir, enviámos um código para o email.',
        );
      },
      error: () => {
        this.enviado.set(true);
        this.loading.set(false);
      },
    });
  }

  definir(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, code, newPassword } = this.form.getRawValue();
    this.auth.resetPassword(email, code, newPassword).subscribe({
      next: () => {
        this.toast.success('Password reposta. Sessão iniciada!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Não foi possível repor a password');
        this.loading.set(false);
      },
    });
  }

  voltarEmail(): void {
    this.enviado.set(false);
    this.devCode.set(null);
    this.form.controls.code.reset();
    this.form.controls.newPassword.reset();
    this.error.set(null);
  }
}
