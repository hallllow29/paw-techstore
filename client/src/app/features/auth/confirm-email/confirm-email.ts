import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type Estado = 'a-verificar' | 'ok' | 'erro';

@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink],
  templateUrl: './confirm-email.html',
})
export class ConfirmEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  readonly estado = signal<Estado>('a-verificar');
  readonly mensagem = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.falhar('Link de confirmação inválido.');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: (r) => {
        this.estado.set('ok');
        this.mensagem.set(r.message);
      },
      error: (e) => this.falhar(e?.error?.message ?? 'Link inválido ou expirado.'),
    });
  }

  private falhar(msg: string): void {
    this.estado.set('erro');
    this.mensagem.set(msg);
  }
}
