import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL, TOKEN_KEY } from '../config';
import { AuthResponse, RegisterData, Role, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Estado reativo (signals) do utilizador autenticado
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

  constructor() {
    // Restaura a sessão ao arrancar, se houver token guardado
    if (this.token) {
      this.fetchMe().subscribe({ error: () => this.logout() });
    }
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  register(data: RegisterData): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/register`, data)
      .pipe(tap((res) => this.setSession(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  fetchMe(): Observable<{ user: User }> {
    return this.http
      .get<{ user: User }>(`${API_URL}/auth/me`)
      .pipe(tap((res) => this._user.set(res.user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/auth/password`, { currentPassword, newPassword });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._user.set(null);
  }

  hasRole(...roles: Role[]): boolean {
    const u = this._user();
    return !!u && roles.includes(u.role);
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    this._user.set(res.user);
  }
}
