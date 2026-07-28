import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../../core/models/product.model';

export interface OutstandingRow {
  documentId: number; accountNo: string; accountName: string; accountId: number;
  invoiceNo: string; period?: string; docDate?: string; dueDate?: string;
  total: number; paid: number; outstanding: number;
  itemDesc?: string;   // ada bila invois ada TEPAT satu baris
}

export interface OutstandingAccountRow {
  accountId: number; accountNo: string; accountName: string; balance: number;
}

export interface DocumentLineRow {
  lineId: number; description: string; amount: number;
  periodStart?: string; periodEnd?: string;
}

export interface PaymentType { code: string; label: string; }

export interface ManualPaymentRequest {
  documentIds: number[]; accountId: number; paymentType: string;
  paymentRefNo?: string; paymentDate?: string; amount: number; remarks?: string;
  idempotencyKey?: string;
}

export interface PaymentResult {
  /** payment.id — untuk batal bayaran. */
  paymentId: number;
  /** financial_document.id — untuk resit PDF. Dua id, dua maksud. */
  receiptDocumentId: number;
  /** Nombor resit sebenar (doc_no), bukan rentetan dikarang. */
  receiptNo: string;
  allocated: number; deposit: number;
}

export interface OutstandingQuery {
  account?: string | null; invoice?: string | null;
  category?: number | null; product?: number | null;
  page: number; size: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private base = '/api/v1/payments';

  paymentTypes(): Observable<PaymentType[]> {
    return this.http.get<PaymentType[]>(`${this.base}/payment-types`);
  }

  outstandingAccounts(q: { account?: string | null; name?: string | null; page: number; size: number }): Observable<Page<OutstandingAccountRow>> {
    let params = new HttpParams().set('page', q.page).set('size', q.size);
    if (q.account) params = params.set('account', q.account);
    if (q.name) params = params.set('name', q.name);
    return this.http.get<Page<OutstandingAccountRow>>(`${this.base}/outstanding-accounts`, { params });
  }

  outstanding(q: OutstandingQuery): Observable<Page<OutstandingRow>> {
    let params = new HttpParams()
      .set('page', String(q.page))
      .set('size', String(q.size));
    if (q.account)  params = params.set('account', q.account);
    if (q.invoice)  params = params.set('invoice', q.invoice);
    if (q.category) params = params.set('category', String(q.category));
    if (q.product)  params = params.set('product', String(q.product));
    return this.http.get<Page<OutstandingRow>>(`${this.base}/outstanding`, { params });
  }

  documentLines(documentId: number): Observable<DocumentLineRow[]> {
    return this.http.get<DocumentLineRow[]>(`${this.base}/documents/${documentId}/lines`);
  }

  record(body: ManualPaymentRequest): Observable<PaymentResult> {
    return this.http.post<PaymentResult>(`${this.base}/manual`, body);
  }

  /**
   * Resit PDF. Interceptor menyisipkan Authorization dan X-SP-Id, jadi ini
   * tidak boleh menjadi <a href> biasa.
   *
   * receiptDocumentId ialah financial_document.id — BUKAN
   * PaymentResult.receiptId(), yang mengembalikan payment.id.
   */
  receiptPdf(receiptDocumentId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`/api/v1/statements/receipts/${receiptDocumentId}`, {
      responseType: 'blob', observe: 'response'
    });
  }
}
