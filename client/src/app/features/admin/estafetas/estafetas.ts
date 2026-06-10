import { Component, OnInit, inject, signal } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-estafetas',
  imports: [],
  templateUrl: './estafetas.html',
})
export class Estafetas implements OnInit {
  private users = inject(UserService);

  readonly pendentes = signal<User[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.users.pendingEstafetas().subscribe({
      next: (res) => {
        this.pendentes.set(res.users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  aprovar(id: string): void {
    this.users.aprovar(id).subscribe(() => this.load());
  }

  rejeitar(id: string): void {
    this.users.rejeitar(id).subscribe(() => this.load());
  }
}
