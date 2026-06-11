import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

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

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (res) => {
        if (res.user.status === 'pendente') {
          this.toast.info('A tua conta aguarda aprovação do administrador.');
        } else {
          this.toast.success(`Bem-vindo, ${res.user.nome}!`);
        }
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Falha no login');
        this.loading.set(false);
      },
    });
  }
}
