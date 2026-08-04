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

export interface CollectionRow {
  date: string | null; receiptNo: string; accountNo: string;
  issuedTo: string; description: string; status: string;
  paymentType: string | null; productName: string | null;
  amount: number;
}

export interface CollectionSummary { label: string; count: number; amount: number; }

export interface Collection {
  from: string; to: string;
  byProduct: boolean;
  /**
   * Menapis mengikut tempoh INVOIS yang dilangsaikan. Jumlah SENGAJA
   * tidak sepadan dengan jumlah resit — bayaran kepada tunggakan lama
   * gugur.
   */
  monthlyBasis: boolean;
  rows: CollectionRow[];
  summary: CollectionSummary[];
  total: number;
}

export interface AccountRow {
  accountNo: string; accountName: string;
  /** No. KP/pendaftaran — Excel sahaja; PDF tiada ruang. */
  idNo: string;
  issueTo: string; phone: string; email: string;
  address: string; postcode: string; state: string;
  categoryName: string; status: string;
  /** Negatif bermakna pelanggan ada KREDIT. */
  balance: number;
}

export interface AccountList {
  rows: AccountRow[];
  totalBalance: number;
  activeCount: number;
  inactiveCount: number;
}

export interface SubRow {
  accountNo: string; accountName: string;
  productCode: string; productName: string; productCategory: string;
  quantity: number; startDate: string | null; endDate: string | null;
  /** status ACTIVE DAN end_date belum lepas. */
  active: boolean;
}

export interface SubList {
  rows: SubRow[];
  activeCount: number;
  endedCount: number;
}

export interface ArrearRow {
  accountNo: string; accountName: string; email: string;
  period: string;
  /** Negatif bermakna pelanggan BERKREDIT pada tarikh itu. */
  amount: number;
}

export interface ArrearList {
  asAt: string;
  rows: ArrearRow[];
  total: number;
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

  collection(q: {
    from: string; to: string;
    byProduct: boolean; monthlyBasis: boolean;
    status?: string | null; paymentType?: string | null; productId?: number | null;
  }): Observable<Collection> {
    let p = new HttpParams()
      .set('from', q.from).set('to', q.to)
      .set('byProduct', String(q.byProduct))
      .set('monthlyBasis', String(q.monthlyBasis));
    if (q.status)      p = p.set('status', q.status);
    if (q.paymentType) p = p.set('paymentType', q.paymentType);
    if (q.productId != null) p = p.set('productId', String(q.productId));
    return this.http.get<Collection>(`${this.base}/collection`, { params: p });
  }

  /**
   * PDF laporan kutipan.
   *
   * Interceptor menyisipkan Authorization dan X-SP-Id, jadi ini tidak
   * boleh menjadi pautan biasa.
   */
  collectionPdf(q: {
    from: string; to: string;
    byProduct: boolean; monthlyBasis: boolean;
    status?: string | null; paymentType?: string | null; productId?: number | null;
  }) {
    let p = new HttpParams()
      .set('from', q.from).set('to', q.to)
      .set('byProduct', String(q.byProduct))
      .set('monthlyBasis', String(q.monthlyBasis));
    if (q.status)      p = p.set('status', q.status);
    if (q.paymentType) p = p.set('paymentType', q.paymentType);
    if (q.productId != null) p = p.set('productId', String(q.productId));
    return this.http.get(`${this.base}/collection/pdf`,
      { params: p, responseType: 'blob', observe: 'response' as const });
  }

  accountList(q: { active?: boolean | null; categoryId?: number | null;
                   search?: string | null }): Observable<AccountList> {
    let p = new HttpParams();
    if (q.active != null)     p = p.set('active', String(q.active));
    if (q.categoryId != null) p = p.set('categoryId', String(q.categoryId));
    if (q.search)             p = p.set('search', q.search);
    return this.http.get<AccountList>(`${this.base}/account-list`, { params: p });
  }

  accountListPdf(q: { active?: boolean | null; categoryId?: number | null;
                      search?: string | null }) {
    let p = new HttpParams();
    if (q.active != null)     p = p.set('active', String(q.active));
    if (q.categoryId != null) p = p.set('categoryId', String(q.categoryId));
    if (q.search)             p = p.set('search', q.search);
    return this.http.get(`${this.base}/account-list/pdf`,
      { params: p, responseType: 'blob', observe: 'response' as const });
  }

  subscriptions(q: { productCategoryId?: number | null; productId?: number | null;
                     status?: boolean | null }): Observable<SubList> {
    let p = new HttpParams();
    if (q.productCategoryId != null) p = p.set('productCategoryId', String(q.productCategoryId));
    if (q.productId != null)         p = p.set('productId', String(q.productId));
    if (q.status != null)            p = p.set('status', String(q.status));
    return this.http.get<SubList>(`${this.base}/account-list/subscriptions`, { params: p });
  }

  subscriptionsPdf(q: { productCategoryId?: number | null; productId?: number | null;
                        status?: boolean | null }) {
    let p = new HttpParams();
    if (q.productCategoryId != null) p = p.set('productCategoryId', String(q.productCategoryId));
    if (q.productId != null)         p = p.set('productId', String(q.productId));
    if (q.status != null)            p = p.set('status', String(q.status));
    return this.http.get(`${this.base}/account-list/subscriptions/pdf`,
      { params: p, responseType: 'blob', observe: 'response' as const });
  }

  arrears(asAt: string, arrearsOnly: boolean): Observable<ArrearList> {
    return this.http.get<ArrearList>(`${this.base}/account-list/arrears`,
      { params: new HttpParams().set('asAt', asAt)
                                .set('arrearsOnly', String(arrearsOnly)) });
  }

  arrearsPdf(asAt: string, arrearsOnly: boolean) {
    return this.http.get(`${this.base}/account-list/arrears/pdf`,
      { params: new HttpParams().set('asAt', asAt)
                                .set('arrearsOnly', String(arrearsOnly)),
        responseType: 'blob', observe: 'response' as const });
  }

  profitLoss(from: string | null, to: string | null): Observable<ProfitLoss> {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to)   p = p.set('to', to);
    return this.http.get<ProfitLoss>(`${this.base}/profit-loss`, { params: p });
  }
}
