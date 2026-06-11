import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Coupon } from '../models/order.model';

interface ValidateResponse {
  success: boolean;
  codigo: string;
  desconto: number;
}
interface CouponListResponse {
  success: boolean;
  count: number;
  coupons: Coupon[];
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly http = inject(HttpClient);

  validate(codigo: string, subtotal: number): Observable<ValidateResponse> {
    return this.http.post<ValidateResponse>(`${API_URL}/coupons/validate`, { codigo, subtotal });
  }

  list(): Observable<CouponListResponse> {
    return this.http.get<CouponListResponse>(`${API_URL}/coupons`);
  }

  create(body: Partial<Coupon>): Observable<{ coupon: Coupon }> {
    return this.http.post<{ coupon: Coupon }>(`${API_URL}/coupons`, body);
  }

  update(id: string, body: Partial<Coupon>): Observable<{ coupon: Coupon }> {
    return this.http.put<{ coupon: Coupon }>(`${API_URL}/coupons/${id}`, body);
  }

  remove(id: string): Observable<unknown> {
    return this.http.delete(`${API_URL}/coupons/${id}`);
  }
}
