import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../../core/models/product.model';

// ---------- Model ----------

export interface ExpCategory {
  id: number; name: string; parentId: number | null;
  glAccountId: number | null; sortOrder: number; active: boolean;
}

export interface ExpSupplier {
  id: number; name: string; regNo?: string | null; tin?: string | null;
  address?: string | null; phone?: string | null; email?: string | null;
  bankName?: string | null; bankAccNo?: string | null; active: boolean;
}

export interface ExpInvoiceRow {
  id: number; invNo: string; supplierId: number; supplierName: string;
  invDate: string; dueDate: string | null;
  subtotal: number; sstAmount: number; total: number;
  paid: number; balance: number; status: string; overdue: boolean;
}

export interface ExpInvoiceItem {
  id: number; categoryId: number; categoryName: string;
  description: string | null; amount: number;
}

export interface ExpInvoiceDetail {
  header: ExpInvoiceRow; note: string | null; items: ExpInvoiceItem[];
}

export interface ExpPaymentRow {
  id: number; pvNo: string; invoiceId: number; invNo: string;
  supplierName: string; payDate: string; amount: number;
  method: string; refNo: string | null; status: string;
}

export interface ExpCashRow {
  id: number; voucherNo: string; entryDate: string;
  categoryId: number; categoryName: string; payee: string;
  description: string | null; amount: number; method: string;
  refNo: string | null; status: string;
}

export interface ExpCashbookRow {
  date: string; docNo: string; source: string;
  description: string; amount: number;
}

export interface ExpSetting {
  sstEnabled: boolean; sstRate: number;
  pvPrefix: string; pvNoSize: number; pvNoStart: number;
  cashPrefix: string; cashNoSize: number; cashNoStart: number;
  bankGlAccountId: number | null;
}

// ---------- Servis ----------

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);
  private base = '/api/v1/expenses';

  // Kategori
  categories(): Observable<ExpCategory[]> {
    return this.http.get<ExpCategory[]>(`${this.base}/categories`);
  }
  saveCategory(body: Partial<ExpCategory>, id?: number): Observable<ExpCategory> {
    return id
      ? this.http.put<ExpCategory>(`${this.base}/categories/${id}`, body)
      : this.http.post<ExpCategory>(`${this.base}/categories`, body);
  }
  deactivateCategory(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/categories/${id}`);
  }

  // Pembekal
  suppliers(): Observable<ExpSupplier[]> {
    return this.http.get<ExpSupplier[]>(`${this.base}/suppliers`);
  }
  saveSupplier(body: Partial<ExpSupplier>, id?: number): Observable<ExpSupplier> {
    return id
      ? this.http.put<ExpSupplier>(`${this.base}/suppliers/${id}`, body)
      : this.http.post<ExpSupplier>(`${this.base}/suppliers`, body);
  }
  deactivateSupplier(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/suppliers/${id}`);
  }

  // Invois
  invoices(status: string | null, page: number, size: number): Observable<Page<ExpInvoiceRow>> {
    let p = new HttpParams().set('page', String(page)).set('size', String(size));
    if (status) p = p.set('status', status);
    return this.http.get<Page<ExpInvoiceRow>>(`${this.base}/invoices`, { params: p });
  }
  invoice(id: number): Observable<ExpInvoiceDetail> {
    return this.http.get<ExpInvoiceDetail>(`${this.base}/invoices/${id}`);
  }
  createInvoice(body: unknown): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/invoices`, body);
  }
  cancelInvoice(id: number, reason: string): Observable<unknown> {
    return this.http.delete(`${this.base}/invoices/${id}`, { body: { reason } });
  }

  // Bayaran
  payments(page: number, size: number): Observable<Page<ExpPaymentRow>> {
    return this.http.get<Page<ExpPaymentRow>>(`${this.base}/payments`,
      { params: new HttpParams().set('page', String(page)).set('size', String(size)) });
  }
  pay(body: unknown): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/payments`, body);
  }
  cancelPayment(id: number, reason: string): Observable<unknown> {
    return this.http.delete(`${this.base}/payments/${id}`, { body: { reason } });
  }

  // Bayaran terus
  cashEntries(from: string | null, to: string | null, page: number, size: number)
      : Observable<Page<ExpCashRow>> {
    let p = new HttpParams().set('page', String(page)).set('size', String(size));
    if (from) p = p.set('from', from);
    if (to) p = p.set('to', to);
    return this.http.get<Page<ExpCashRow>>(`${this.base}/cash-entries`, { params: p });
  }
  recordCash(body: unknown): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/cash-entries`, body);
  }
  cancelCash(id: number, reason: string): Observable<unknown> {
    return this.http.delete(`${this.base}/cash-entries/${id}`, { body: { reason } });
  }

  // Buku tunai
  cashbook(from: string | null, to: string | null): Observable<ExpCashbookRow[]> {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to) p = p.set('to', to);
    return this.http.get<ExpCashbookRow[]>(`${this.base}/cashbook`, { params: p });
  }

  // Tetapan
  settings(): Observable<ExpSetting> {
    return this.http.get<ExpSetting>(`${this.base}/settings`);
  }
  saveSettings(body: ExpSetting): Observable<ExpSetting> {
    return this.http.put<ExpSetting>(`${this.base}/settings`, body);
  }
}
