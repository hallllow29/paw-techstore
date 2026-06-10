import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { User } from '../models/user.model';

interface UserListResponse {
  success: boolean;
  count: number;
  users: User[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  pendingEstafetas(): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(`${API_URL}/users/estafetas/pendentes`);
  }

  aprovar(id: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/users/${id}/aprovar`, {});
  }

  rejeitar(id: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/users/${id}/rejeitar`, {});
  }
}
