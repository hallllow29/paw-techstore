import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import {
  CompareResponse,
  Product,
  ProductListResponse,
  ProductQuery,
} from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  list(query: ProductQuery = {}): Observable<ProductListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ProductListResponse>(`${API_URL}/products`, { params });
  }

  get(idOrSlug: string): Observable<{ product: Product }> {
    return this.http.get<{ product: Product }>(`${API_URL}/products/${idOrSlug}`);
  }

  compare(ids: string[]): Observable<CompareResponse> {
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<CompareResponse>(`${API_URL}/products/compare`, { params });
  }

  create(form: FormData): Observable<{ product: Product }> {
    return this.http.post<{ product: Product }>(`${API_URL}/products`, form);
  }

  update(id: string, form: FormData): Observable<{ product: Product }> {
    return this.http.put<{ product: Product }>(`${API_URL}/products/${id}`, form);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${API_URL}/products/${id}`);
  }
}
