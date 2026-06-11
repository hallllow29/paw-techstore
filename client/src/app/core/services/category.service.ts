import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Category } from '../models/catalog.model';

interface CategoryListResponse {
  success: boolean;
  count: number;
  categories: Category[];
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  list(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(`${API_URL}/categories`);
  }

  create(body: { nome: string; parent?: string | null }): Observable<{ category: Category }> {
    return this.http.post<{ category: Category }>(`${API_URL}/categories`, body);
  }

  update(id: string, body: Partial<Category>): Observable<{ category: Category }> {
    return this.http.put<{ category: Category }>(`${API_URL}/categories/${id}`, body);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${API_URL}/categories/${id}`);
  }
}
