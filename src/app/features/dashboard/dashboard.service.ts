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

export interface MainProduct {
  name: string | null; rate: number; frequency: string | null;
  subscribers: number; paid: number; unpaid: number; collectionRate: number;
}

export interface RecentTxn {
  name: string; accountNo: string; amount: number; date: string;
}

export interface ArrearRow {
  name: string; accountNo: string; outstanding: number;
}

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

  mainProduct(): Observable<MainProduct> {
    return this.http.get<MainProduct>(`${this.base}/main-product`);
  }

  recentTransactions(): Observable<RecentTxn[]> {
    return this.http.get<RecentTxn[]>(`${this.base}/recent-transactions`);
  }

  topArrears(): Observable<ArrearRow[]> {
    return this.http.get<ArrearRow[]>(`${this.base}/top-arrears`);
  }
}
