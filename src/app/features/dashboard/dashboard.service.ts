import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface DashboardSummary {
  collectedThisMonth: number;
  outstanding: number;
  activeAccounts: number;
  inactiveAccounts: number;
  billsThisMonth: number;
}

export interface ChartPoint { month: string; amount: number; }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = '/api/v1/dashboard';

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/summary`);
  }

  collectionChart(months: 6 | 12 = 6): Observable<ChartPoint[]> {
    const params = new HttpParams().set('months', String(months));
    return this.http.get<ChartPoint[]>(`${this.base}/collection-chart`, { params });
  }
}
