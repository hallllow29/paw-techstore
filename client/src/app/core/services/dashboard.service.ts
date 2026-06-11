import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Role } from '../models/user.model';

export interface DashboardResponse {
  success: boolean;
  role: Role;
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${API_URL}/dashboard`);
  }
}
