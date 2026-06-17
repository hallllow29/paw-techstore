import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserStatus } from '../../../core/models/user.model';

type Modo = 'password' | 'otp';
type Canal = 'email' | 'sms';

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
  readonly canal = signal<Canal>('email');
  readonly otpEnviado = signal(false);
  readonly devCode = signal<string | null>(null);
  // Conta por confirmar: mostra aviso + botão de reenvio (quando há email).
  readonly naoConfirmado = signal(false);
  readonly emailParaReenvio = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  // identificador = email (canal email) ou telemóvel (canal SMS)
  readonly otpForm = this.fb.nonNullable.group({
    identificador: ['', [Validators.required]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  setModo(m: Modo): void {
    this.modo.set(m);
    this.limparEstado();
  }

  setCanal(c: Canal): void {
    this.canal.set(c);
    this.otpForm.controls.identificador.reset('');
    this.limparEstado();
  }

  // ─── Login por password ───
  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.emailParaReenvio.set(email);
    this.auth.login(email, password).subscribe({
      next: (res) => this.aposLogin(res.user.nome, res.user.status),
      error: (err) => this.falha(err, 'Falha no login'),
    });
  }

  // ─── Login por código (OTP), por email ou SMS ───
  pedirCodigo(): void {
    const ctrl = this.otpForm.controls.identificador;
    const valor = ctrl.value.trim();
    const porSms = this.canal() === 'sms';
    const invalido = porSms ? valor.length < 6 : !/^\S+@\S+\.\S+$/.test(valor);
    if (invalido) {
      ctrl.markAsTouched();
      this.error.set(porSms ? 'Indica um número de telemóvel válido.' : 'Indica um email válido.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.requestOtp(valor, this.canal()).subscribe({
      next: (res) => {
        this.otpEnviado.set(true);
        this.devCode.set(res.devCode ?? null);
        this.loading.set(false);
        this.toast.info(
          porSms
            ? 'Se a conta existir, enviámos um código por SMS para o teu telemóvel.'
            : 'Se a conta existir, enviámos um código para o email.',
        );
      },
      // A resposta é genérica; avançamos para o passo do código de qualquer forma.
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
    const { identificador, code } = this.otpForm.getRawValue();
    // Para reenvio de confirmação só faz sentido se o identificador for um email.
    this.emailParaReenvio.set(this.canal() === 'email' ? identificador : null);
    this.auth.verifyOtp(identificador, code, this.canal()).subscribe({
      next: (res) => this.aposLogin(res.user.nome, res.user.status),
      error: (err) => this.falha(err, 'Código inválido ou expirado'),
    });
  }

  trocarIdentificador(): void {
    this.otpEnviado.set(false);
    this.devCode.set(null);
    this.otpForm.controls.code.reset('');
    this.limparEstado();
  }

  reenviarConfirmacao(): void {
    const email = this.emailParaReenvio();
    if (!email) return;
    this.auth.resendVerification(email).subscribe({
      next: (r) => this.toast.success(r.message),
      error: () => this.toast.error('Não foi possível reenviar agora. Tenta mais tarde.'),
    });
  }

  private aposLogin(nome: string, status: UserStatus): void {
    if (status === 'pendente') {
      this.toast.info('A tua conta aguarda aprovação do administrador.');
    } else {
      this.toast.success(`Bem-vindo, ${nome}!`);
    }
    this.router.navigate(['/']);
  }

  private falha(
    err: { error?: { message?: string; naoConfirmado?: boolean } },
    fallback: string,
  ): void {
    this.loading.set(false);
    if (err?.error?.naoConfirmado) {
      this.naoConfirmado.set(true);
      this.error.set(err.error.message ?? 'Confirma o teu email antes de entrares.');
      return;
    }
    this.error.set(err?.error?.message ?? fallback);
  }

  private limparEstado(): void {
    this.error.set(null);
    this.naoConfirmado.set(false);
  }
}
