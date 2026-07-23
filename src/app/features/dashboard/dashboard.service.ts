import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface DashboardSummary {
  collectedThisMonth: number;
  outstanding: number;
  activeAccounts: number;
  inactiveAccounts: number;
  billsThisMonth: number;
  target: number;            // sasaran = invois dikeluarkan bulan ini
  collectionRate: number;    // terkumpul / sasaran (%)
  momChange: number;         // % vs bulan lepas
  invoicedAccounts: number;  // akaun dikeluarkan invois bulan ini
  paidAccounts: number;      // antara itu, yang sudah bayar
  unpaidAccounts: number;
  arrearsAccounts: number;   // jumlah akaun bertunggak (semua)
}

export interface InvVsCol {
  month: string;
  invoiced: number;      // invois dijana bulan itu
  collected: number;     // semua bayaran diterima bulan itu
  collectedOwn: number;  // bahagian yang pergi ke invois bulan itu
}

export interface ProductSlice { name: string; amount: number; pct: number; }
export interface MainProduct {
  name: string | null; rate: number; frequency: string | null;
  subscribers: number; paid: number; unpaid: number; collectionRate: number;
}
export interface RecentTxn { name: string; accountNo: string; amount: number; date: string; }
export interface ArrearRow { name: string; accountNo: string; outstanding: number; }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = '/api/v1/dashboard';

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/summary`);
  }

  invoiceVsCollection(months: 6 | 12 = 6): Observable<InvVsCol[]> {
    const params = new HttpParams().set('months', String(months));
    return this.http.get<InvVsCol[]>(`${this.base}/invoice-vs-collection`, { params });
  }

  collectionByProduct(): Observable<ProductSlice[]> {
    return this.http.get<ProductSlice[]>(`${this.base}/collection-by-product`);
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
