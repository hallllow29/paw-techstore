import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService, AuditEntry } from '../../../core/services/user.service';

@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe, RouterLink],
  templateUrl: './audit.html',
})
export class AdminAudit implements OnInit {
  private readonly users = inject(UserService);
  readonly logs = signal<AuditEntry[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.users.audit().subscribe({
      next: (r) => {
        this.logs.set(r.logs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
