import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { ProductReview } from '../models/catalog.model';

interface ReviewListResponse {
  success: boolean;
  media: number;
  total: number;
  reviews: ProductReview[];
}
interface ReviewStatus {
  success: boolean;
  jaAvaliou: boolean;
  podeAvaliar: boolean;
  review: ProductReview | null;
}
interface CreateReviewResponse {
  success: boolean;
  review: ProductReview;
  ratingMedia: number;
  numAvaliacoes: number;
}

@Injectable({ providedIn: 'root' })
export class ProductReviewService {
  private readonly http = inject(HttpClient);

  list(idOrSlug: string): Observable<ReviewListResponse> {
    return this.http.get<ReviewListResponse>(`${API_URL}/products/${idOrSlug}/reviews`);
  }

  myStatus(idOrSlug: string): Observable<ReviewStatus> {
    return this.http.get<ReviewStatus>(`${API_URL}/products/${idOrSlug}/reviews/me`);
  }

  create(
    idOrSlug: string,
    body: { rating: number; comentario?: string },
  ): Observable<CreateReviewResponse> {
    return this.http.post<CreateReviewResponse>(`${API_URL}/products/${idOrSlug}/reviews`, body);
  }
}
