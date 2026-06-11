import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { StoreSettings } from '../models/order.model';

interface StoreResponse {
  success: boolean;
  settings: StoreSettings;
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly http = inject(HttpClient);

  get(): Observable<StoreResponse> {
    return this.http.get<StoreResponse>(`${API_URL}/store`);
  }

  couriers(): Observable<{ total: number; livres: number }> {
    return this.http.get<{ total: number; livres: number }>(`${API_URL}/store/estafetas`);
  }

  update(form: FormData): Observable<StoreResponse> {
    return this.http.put<StoreResponse>(`${API_URL}/store`, form);
  }
}
