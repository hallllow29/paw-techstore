import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserStatus } from '../../../core/models/user.model';

type Modo = 'password' | 'otp';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly modo = signal<Modo>('password');
  readonly otpEnviado = signal(false);
  readonly devCode = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly otpForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  setModo(m: Modo): void {
    this.modo.set(m);
    this.error.set(null);
  }

  // ─── Login por password ───
  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => this.aposLogin(res.user.nome, res.user.status),
      error: (err) => this.falha(err, 'Falha no login'),
    });
  }

  // ─── Login por código no email (OTP) ───
  pedirCodigo(): void {
    const email = this.otpForm.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.requestOtp(email.value).subscribe({
      next: (res) => {
        this.otpEnviado.set(true);
        this.devCode.set(res.devCode ?? null);
        this.loading.set(false);
        this.toast.info('Se a conta existir, enviámos um código para o email.');
      },
      // A resposta é sempre genérica; avançamos para o passo do código de qualquer forma.
      error: () => {
        this.otpEnviado.set(true);
        this.loading.set(false);
      },
    });
  }

  confirmarCodigo(): void {
    if (this.otpForm.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, code } = this.otpForm.getRawValue();
    this.auth.verifyOtp(email, code).subscribe({
      next: (res) => this.aposLogin(res.user.nome, res.user.status),
      error: (err) => this.falha(err, 'Código inválido ou expirado'),
    });
  }

  trocarEmail(): void {
    this.otpEnviado.set(false);
    this.devCode.set(null);
    this.otpForm.controls.code.reset();
    this.error.set(null);
  }

  private aposLogin(nome: string, status: UserStatus): void {
    if (status === 'pendente') {
      this.toast.info('A tua conta aguarda aprovação do administrador.');
    } else {
      this.toast.success(`Bem-vindo, ${nome}!`);
    }
    this.router.navigate(['/']);
  }

  private falha(err: { error?: { message?: string } }, fallback: string): void {
    this.error.set(err?.error?.message ?? fallback);
    this.loading.set(false);
  }
}
