import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Role, User, UserStatus } from '../models/user.model';

interface UserListResponse {
  success: boolean;
  count: number;
  users: User[];
}

export interface AuditEntry {
  _id: string;
  atorNome: string;
  acao: string;
  alvo: string;
  detalhe: string;
  ip: string;
  createdAt: string;
}
interface AuditResponse {
  success: boolean;
  count: number;
  logs: AuditEntry[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  /** Lista utilizadores (admin), com filtros opcionais por papel e estado. */
  list(filtros: { role?: Role; status?: UserStatus } = {}): Observable<UserListResponse> {
    let params = new HttpParams();
    if (filtros.role) params = params.set('role', filtros.role);
    if (filtros.status) params = params.set('status', filtros.status);
    return this.http.get<UserListResponse>(`${API_URL}/users`, { params });
  }

  pendingEstafetas(): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(`${API_URL}/users/estafetas/pendentes`);
  }

  aprovar(id: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/users/${id}/aprovar`, {});
  }

  rejeitar(id: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/users/${id}/rejeitar`, {});
  }

  banir(id: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/users/${id}/banir`, {});
  }

  desbanir(id: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/users/${id}/desbanir`, {});
  }

  /** Registo de auditoria de ações sensíveis (admin). */
  audit(): Observable<AuditResponse> {
    return this.http.get<AuditResponse>(`${API_URL}/users/audit`);
  }
}
