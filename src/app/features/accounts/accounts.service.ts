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

  statement(id: number): Observable<StatementResponse> {
    return this.http.get<StatementResponse>(`${this.base}/${id}/statement`);
  }

  paymentReport(accountId: number, year: string): Observable<PaymentReportResponse> {
    return this.http.get<PaymentReportResponse>('/api/v1/payments/payment-report',
      { params: new HttpParams().set('accountId', String(accountId)).set('year', year).set('page', '0').set('size', '200') });
  }

  myAccounts(): Observable<MyAccountRow[]> {
    return this.http.get<MyAccountRow[]>(`${this.base}/my`);
  }

  getOne(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  update(id: number, body: Record<string, unknown>): Observable<{ id: number; message: string }> {
    return this.http.put<{ id: number; message: string }>(`${this.base}/${id}`, body);
  }

  searchUser(email: string): Observable<{ found: boolean; userId?: number; fullName?: string }> {
    return this.http.get<{ found: boolean; userId?: number; fullName?: string }>(
      `${this.base}/search-user`, { params: { email } });
  }

  linkUser(id: number, email: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/link`, { email });
  }

  unlinkUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}/link`);
  }

  addSubscriptions(id: number, subscriptions: any[]): Observable<{ added: number; message: string }> {
    return this.http.post<{ added: number; message: string }>(`${this.base}/${id}/subscriptions`, { subscriptions });
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

export interface StatementLine {
  date: string; docNo: string; docType: string; item: string;
  period: string | null; debit: number; credit: number; balance: number;
}
export interface StatementResponse {
  accountId: number; accountNo: string; accountName: string;
  openingBalance: number; closingBalance: number; lines: StatementLine[];
}

export interface PaymentReportRow {
  period: string; invoice: string; invAmount: number; receipts: string | null;
}
export interface PaymentReportResponse {
  items: PaymentReportRow[]; total: number; page: number; pageSize: number;
}

export interface MyAccountRow {
  id: number; spCode: string; spName: string;
  accountNo: string; accountName: string; balance: number;
  latestInvoiceAmount: number | null; dueDate: string | null;
}
