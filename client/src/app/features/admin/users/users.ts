import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { imageUrl } from '../../../core/config';
import { Role, User, UserStatus } from '../../../core/models/user.model';

const ROLE_LABEL: Record<Role, string> = {
  cliente: 'Cliente',
  loja: 'Loja',
  estafeta: 'Estafeta',
  admin: 'Admin',
};
const ROLE_COR: Record<Role, string> = {
  cliente: 'secondary',
  loja: 'primary',
  estafeta: 'info',
  admin: 'dark',
};
const STATUS_LABEL: Record<UserStatus, string> = {
  ativo: 'Ativo',
  pendente: 'Pendente',
  rejeitado: 'Rejeitado',
  banido: 'Suspenso',
};
const STATUS_COR: Record<UserStatus, string> = {
  ativo: 'success',
  pendente: 'warning',
  rejeitado: 'secondary',
  banido: 'danger',
};

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly img = imageUrl;

  readonly lista = signal<User[]>([]);
  readonly loading = signal(true);
  readonly termo = signal('');
  readonly fRole = signal<'' | Role>('');
  readonly fStatus = signal<'' | UserStatus>('');

  readonly roles: Role[] = ['cliente', 'loja', 'estafeta', 'admin'];
  readonly estados: UserStatus[] = ['ativo', 'pendente', 'rejeitado', 'banido'];

  readonly filtrados = computed(() => {
    const t = this.termo().trim().toLowerCase();
    if (!t) return this.lista();
    return this.lista().filter(
      (u) => u.nome.toLowerCase().includes(t) || u.email.toLowerCase().includes(t),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.users
      .list({ role: this.fRole() || undefined, status: this.fStatus() || undefined })
      .subscribe({
        next: (r) => {
          this.lista.set(r.users);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  setRole(v: string): void {
    this.fRole.set(v as '' | Role);
    this.load();
  }
  setStatus(v: string): void {
    this.fStatus.set(v as '' | UserStatus);
    this.load();
  }

  isSelf(u: User): boolean {
    return this.auth.user()?._id === u._id;
  }

  aprovar(u: User): void {
    this.users.aprovar(u._id).subscribe(() => {
      this.toast.success(`${u.nome} aprovado`);
      this.load();
    });
  }
  rejeitar(u: User): void {
    this.users.rejeitar(u._id).subscribe(() => {
      this.toast.info(`${u.nome} rejeitado`);
      this.load();
    });
  }
  banir(u: User): void {
    if (!globalThis.confirm(`Suspender a conta de ${u.nome}?`)) return;
    this.users.banir(u._id).subscribe({
      next: () => {
        this.toast.success(`${u.nome} suspenso`);
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Não foi possível suspender'),
    });
  }
  desbanir(u: User): void {
    this.users.desbanir(u._id).subscribe(() => {
      this.toast.success(`${u.nome} reativado`);
      this.load();
    });
  }

  roleLabel(r: Role): string {
    return ROLE_LABEL[r] ?? r;
  }
  roleCor(r: Role): string {
    return ROLE_COR[r] ?? 'secondary';
  }
  statusLabel(s: UserStatus): string {
    return STATUS_LABEL[s] ?? s;
  }
  statusCor(s: UserStatus): string {
    return STATUS_COR[s] ?? 'secondary';
  }
}
