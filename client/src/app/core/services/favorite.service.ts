import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { AuthService } from './auth.service';
import { Product } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _ids = signal<Set<string>>(new Set());
  readonly ids = this._ids.asReadonly();

  constructor() {
    if (this.auth.token) this.load();
  }

  load(): void {
    this.http
      .get<{ favoritos: Product[] }>(`${API_URL}/favorites`)
      .subscribe((r) => this._ids.set(new Set(r.favoritos.map((p) => p._id))));
  }

  list(): Observable<{ favoritos: Product[] }> {
    return this.http.get<{ favoritos: Product[] }>(`${API_URL}/favorites`);
  }

  isFavorite(id: string): boolean {
    return this._ids().has(id);
  }

  toggle(id: string): void {
    this.http
      .post<{ favoritos: string[] }>(`${API_URL}/favorites/${id}`, {})
      .subscribe((r) => this._ids.set(new Set(r.favoritos)));
  }
}
