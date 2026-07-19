import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Account } from '../../core/models/account.model';
import { Page } from '../../core/models/product.model';

export interface AccountQuery {
  active: boolean;
  category?: number | null;
  linked?: boolean | null;
  q?: string | null;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private http = inject(HttpClient);
  private base = '/api/v1/accounts';

  list(query: AccountQuery): Observable<Page<Account>> {
    let params = new HttpParams()
      .set('active', String(query.active))
      .set('page', String(query.page))
      .set('size', String(query.size));

    if (query.category != null) params = params.set('category', String(query.category));
    if (query.linked != null)   params = params.set('linked', String(query.linked));
    if (query.q)                params = params.set('q', query.q);

    return this.http.get<Page<Account>>(this.base, { params });
  }

  create(body: Record<string, unknown>): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, body);
  }

  categories(): Observable<{ id: number; code: string; name: string }[]> {
    return this.http.get<{ id: number; code: string; name: string }[]>('/api/v1/settings/account-categories');
  }

  postcodeLookup(code: string): Observable<{ postcode: string; state: string; cities: string[] }> {
    return this.http.get<{ postcode: string; state: string; cities: string[] }>(
      `/api/v1/lookup/postcode/${code}`);
  }

  config(): Observable<{ allowPriceOverride: boolean }> {
    return this.http.get<{ allowPriceOverride: boolean }>('/api/v1/accounts/config');
  }
}
