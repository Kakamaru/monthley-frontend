import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../../core/models/product.model';

export interface UserRow {
  id: number; email: string; fullName: string; mobile?: string; status: string;
  spCount: number; spNames?: string; accountCount: number; createdAt?: string;
}

export interface UserQuery {
  q?: string | null; status?: string | null; role?: string | null;
  page: number; size: number;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = '/api/v1/platform/users';

  list(query: UserQuery): Observable<Page<UserRow>> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('size', String(query.size));
    if (query.q)      params = params.set('q', query.q);
    if (query.status) params = params.set('status', query.status);
    if (query.role)   params = params.set('role', query.role);
    return this.http.get<Page<UserRow>>(this.base, { params });
  }

  generatePassword(): Observable<{ password: string }> {
    return this.http.post<{ password: string }>(`${this.base}/generate-password`, {});
  }

  changePassword(id: number, password: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/password`, { password });
  }

  changeStatus(id: number, status: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/status`, { status });
  }
}
