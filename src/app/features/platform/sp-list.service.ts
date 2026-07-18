import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../../core/models/product.model';

export interface SpRow {
  spCode: string; name: string;
  bizType?: string; bizTypeName?: string;
  state?: string; city?: string; status: string;
  planName?: string; accountLimit?: number; accountCount: number;
  billingPlan?: string; price?: number;
  adminEmail?: string; approvedAt?: string;
}

export interface SpSummary { total: number; active: number; pending: number; suspended: number; }

export interface SpQuery {
  q?: string | null; bizType?: string | null; status?: string | null;
  plan?: number | null; state?: string | null; page: number; size: number;
}

@Injectable({ providedIn: 'root' })
export class SpListService {
  private http = inject(HttpClient);
  private base = '/api/v1/platform/service-providers';

  list(query: SpQuery): Observable<Page<SpRow>> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('size', String(query.size));
    if (query.q)       params = params.set('q', query.q);
    if (query.bizType) params = params.set('bizType', query.bizType);
    if (query.status)  params = params.set('status', query.status);
    if (query.plan)    params = params.set('plan', String(query.plan));
    if (query.state)   params = params.set('state', query.state);
    return this.http.get<Page<SpRow>>(this.base, { params });
  }

  summary(): Observable<SpSummary> {
    return this.http.get<SpSummary>(`${this.base}/summary`);
  }

  changeStatus(spCode: string, status: string): Observable<unknown> {
    return this.http.patch(`${this.base}/${spCode}/status`, { status });
  }
}
