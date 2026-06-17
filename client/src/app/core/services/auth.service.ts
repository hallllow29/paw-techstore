import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL, readToken, storeToken, clearToken } from '../config';
import { AuthResponse, RegisterData, Role, User } from '../models/user.model';
import { CartService } from './cart.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly cart = inject(CartService);

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
    return readToken();
  }

  /** Regista a conta. NÃO inicia sessão — exige confirmação de email primeiro. */
  register(data: RegisterData): Observable<{ success: boolean; message: string; user: User }> {
    return this.http.post<{ success: boolean; message: string; user: User }>(
      `${API_URL}/auth/register`,
      data,
    );
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

  /**
   * Pede um código de acesso (clientes). No canal SMS o identificador é o
   * telemóvel; no email, é o email.
   */
  requestOtp(
    identificador: string,
    canal: 'email' | 'sms' = 'email',
  ): Observable<{ message: string; devCode?: string }> {
    const body =
      canal === 'sms' ? { telefone: identificador, canal } : { email: identificador, canal };
    return this.http.post<{ message: string; devCode?: string }>(
      `${API_URL}/auth/otp/request`,
      body,
    );
  }

  /** Valida o código (por email ou telemóvel) e inicia a sessão. */
  verifyOtp(
    identificador: string,
    code: string,
    canal: 'email' | 'sms' = 'email',
  ): Observable<AuthResponse> {
    const body =
      canal === 'sms' ? { telefone: identificador, code } : { email: identificador, code };
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/otp/verify`, body)
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Pede um código para repor a password (email ou SMS). */
  forgotPassword(
    email: string,
    canal: 'email' | 'sms' = 'email',
  ): Observable<{ message: string; devCode?: string }> {
    return this.http.post<{ message: string; devCode?: string }>(
      `${API_URL}/auth/password/forgot`,
      { email, canal },
    );
  }

  /** Valida o código e define a nova password (inicia sessão). */
  resetPassword(email: string, code: string, newPassword: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/password/reset`, { email, code, newPassword })
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Confirma o email a partir do token do link. Atualiza a sessão se for o próprio. */
  verifyEmail(token: string): Observable<{ success: boolean; message: string; user: User }> {
    return this.http
      .post<{
        success: boolean;
        message: string;
        user: User;
      }>(`${API_URL}/auth/email/verify`, { token })
      .pipe(
        tap((res) => {
          if (this._user()?._id === res.user._id) this._user.set(res.user);
        }),
      );
  }

  /** Reenvia o email de confirmação (público, por email). */
  resendVerification(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${API_URL}/auth/email/resend`, {
      email,
    });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/auth/password`, { currentPassword, newPassword });
  }

  updateProfile(data: {
    nome?: string;
    morada?: string;
    telefone?: string;
  }): Observable<{ user: User }> {
    return this.http
      .patch<{ user: User }>(`${API_URL}/auth/me`, data)
      .pipe(tap((res) => this._user.set(res.user)));
  }

  /** Atualiza a foto de perfil (upload). */
  uploadAvatar(file: File): Observable<{ user: User }> {
    const fd = new FormData();
    fd.append('avatar', file);
    return this.http
      .patch<{ user: User }>(`${API_URL}/auth/avatar`, fd)
      .pipe(tap((res) => this._user.set(res.user)));
  }

  logout(): void {
    clearToken();
    this._user.set(null);
    // O carrinho não deve sobreviver à sessão (nem ficar visível ao próximo
    // utilizador numa máquina partilhada).
    this.cart.clear();
  }

  hasRole(...roles: Role[]): boolean {
    const u = this._user();
    return !!u && roles.includes(u.role);
  }

  private setSession(res: AuthResponse): void {
    storeToken(res.token);
    this._user.set(res.user);
  }
}
