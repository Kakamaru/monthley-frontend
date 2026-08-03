import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface TrialRow {
  code: string; name: string; accountType: string;
  debit: number; credit: number;
}

export interface TrialBalance {
  asAt: string;
  rows: TrialRow[];
  totalDebit: number;
  totalCredit: number;
  /** Palsu bermakna pembukuan rosak — bukan masalah paparan. */
  balanced: boolean;
}

export interface PnlRow { code: string; name: string; amount: number; }

export interface ProfitLoss {
  from: string; to: string;
  income: PnlRow[];  totalIncome: number;
  expense: PnlRow[]; totalExpense: number;
  net: number;
  /** Palsu bermakna tiada akaun perbelanjaan mempunyai pergerakan. */
  expenseModuleActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private base = '/api/v1/reports';

  trialBalance(asAt: string | null): Observable<TrialBalance> {
    let p = new HttpParams();
    if (asAt) p = p.set('asAt', asAt);
    return this.http.get<TrialBalance>(`${this.base}/trial-balance`, { params: p });
  }

  profitLoss(from: string | null, to: string | null): Observable<ProfitLoss> {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to)   p = p.set('to', to);
    return this.http.get<ProfitLoss>(`${this.base}/profit-loss`, { params: p });
  }
}
