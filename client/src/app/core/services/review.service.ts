import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Review } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  create(body: {
    orderId: string;
    ratingEncomenda: number;
    ratingEstafeta?: number;
    comentario?: string;
  }): Observable<{ review: Review }> {
    return this.http.post<{ review: Review }>(`${API_URL}/reviews`, body);
  }

  getByOrder(orderId: string): Observable<{ review: Review | null }> {
    return this.http.get<{ review: Review | null }>(`${API_URL}/reviews/order/${orderId}`);
  }
}
