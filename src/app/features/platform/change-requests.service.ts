import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChangeRequestRow {
  id: number; spCode: string; spName: string; type: string;
  moduleCode: string | null; moduleName: string | null;
  planProductId: number | null; planName: string | null;
  status: string; requestedByEmail: string | null;
  requestedAt: string; decidedAt: string | null; decisionNote: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChangeRequestService {
  private http = inject(HttpClient);
  private base = '/api/v1/platform/change-requests';

  list(status: string | null): Observable<ChangeRequestRow[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return this.http.get<ChangeRequestRow[]>(this.base, { params: p });
  }
  pendingCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/pending-count`);
  }
  approve(id: number, note?: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/approve`, { note: note ?? null });
  }
  reject(id: number, note: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/reject`, { note });
  }
}
