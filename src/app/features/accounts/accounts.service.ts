import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Account } from '../../core/models/account.model';
import { Page } from '../../core/models/product.model';

export interface AccountQuery {
  active: boolean;
  category?: number | null;
  /** Akaun yang MELANGGAN produk ini (baris langganan wujud). */
  product?: number | null;
  /**
   * Songsang: akaun yang BELUM melanggan produk ini.
   *
   * Langganan TAMAT dikira sebagai belum melanggan — guard CASE-007
   * hanya menyekat langganan ACTIVE, jadi akaun yang berhenti boleh
   * melanggan semula.
   */
  excludeProduct?: number | null;
  linked?: boolean | null;
  q?: string | null;
  page: number;
  size: number;
}

/** Caj berasaskan penggunaan bagi satu akaun. */
export interface UsageCharge {
  id: number;
  productCode: string;
  productName: string;
  quantity: number;
  amount: number;
  remarks: string | null;
  /** Nama tempoh, bukan id — 'July, 2026'. */
  periodName: string;
  createdAt: string | null;
  /** Belum dibil: boleh dipadam. */
  pending: boolean;
  invoiceNo: string | null;
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
    if (query.product != null)  params = params.set('product', String(query.product));
    if (query.excludeProduct != null)
      params = params.set('excludeProduct', String(query.excludeProduct));
    if (query.linked != null)   params = params.set('linked', String(query.linked));
    if (query.q)                params = params.set('q', query.q);

    return this.http.get<Page<Account>>(this.base, { params });
  }

  create(body: Record<string, unknown>): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, body);
  }

  /** year null = semua rekod (kekal sebagai pilihan, bukan lalai). */
  statement(id: number, year: number | null, page = 0, size = 50)
      : Observable<StatementResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (year != null) params = params.set('year', String(year));
    return this.http.get<StatementResponse>(`${this.base}/${id}/statement`, { params });
  }

  /**
   * PDF penyata. Interceptor menyisipkan Authorization dan X-SP-Id, jadi
   * ia TIDAK boleh menjadi <a href> biasa — mesti HttpClient dengan blob.
   */
  statementPdf(id: number, year: number | null): Observable<HttpResponse<Blob>> {
    return this.statementFile(`/api/v1/statements/accounts/${id}`, year);
  }

  /** XLSX penyata — dua sheet rata, boleh dipivot. */
  statementXlsx(id: number, year: number | null): Observable<HttpResponse<Blob>> {
    return this.statementFile(`/api/v1/statements/accounts/${id}/xlsx`, year);
  }

  private statementFile(url: string, year: number | null): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    return this.http.get(url, { params, responseType: 'blob', observe: 'response' });
  }

  paymentReport(accountId: number, year: string): Observable<PaymentReportResponse> {
    return this.http.get<PaymentReportResponse>('/api/v1/payments/payment-report',
      { params: new HttpParams().set('accountId', String(accountId)).set('year', year).set('page', '0').set('size', '200') });
  }

  /**
   * Tahun yang benar-benar ada invois untuk akaun ini.
   * Bukan julat tetap: caj tahunan prepaid dibil awal, jadi period tahun
   * hadapan wujud pada tahun semasa. Julat tetap menyembunyikannya terus.
   */
  paymentReportYears(accountId: number): Observable<string[]> {
    return this.http.get<string[]>('/api/v1/payments/payment-report/years',
      { params: new HttpParams().set('accountId', String(accountId)) });
  }

  myAccounts(): Observable<MyAccountRow[]> {
    return this.http.get<MyAccountRow[]>(`${this.base}/my`);
  }

  /** Penyata PDF akaun sendiri. Pemilikan disemak melalui payer_user_id. */
  /**
   * Resit atau invois pelanggan sebagai PDF.
   *
   * Satu kaedah untuk kedua-dua jenis: laluan sahaja yang berbeza, dan
   * pengendalian respons identik. Dua kaedah bermakna corak muat turun
   * disalin dan menyimpang.
   */
  myDocumentPdf(docType: string, id: number): Observable<HttpResponse<Blob>> {
    const laluan = docType === 'RECEIPT' ? 'receipts' : 'invoices';
    return this.http.get(`/api/v1/accounts/my/${laluan}/${id}`, {
      observe: 'response', responseType: 'blob'
    });
  }

  /** Bil tertunggak untuk bayaran dalam talian. */
  onlineOutstanding(accountId: number): Observable<OnlineOutstanding[]> {
    return this.http.get<OnlineOutstanding[]>(
      '/api/v1/payments/online/outstanding',
      { params: new HttpParams().set('accountId', String(accountId)) });
  }

  /**
   * Mulakan bayaran — memulangkan URL gerbang.
   *
   * Bentuk sama seperti Manual Payment: invois dipilih + amaun. Amaun
   * boleh kurang daripada baki (bayaran separa) atau lebih (lebihan
   * menjadi advance).
   */
  startOnlinePayment(accountId: number, documentIds: number[], amount: number)
      : Observable<PaymentStarted> {
    return this.http.post<PaymentStarted>('/api/v1/payments/online/start',
      { accountId, documentIds, amount });
  }

  /** Status selepas pelanggan kembali dari gerbang. */
  onlinePaymentStatus(ourRef: string): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`/api/v1/payments/online/status/${ourRef}`);
  }

  myStatementPdf(accountId: number, year: number | null): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    return this.http.get(`${this.base}/my/${accountId}/statement`, {
      params, responseType: 'blob', observe: 'response'
    });
  }

  adjustmentInvoices(accountId: number): Observable<AdjInvoiceOption[]> {
    return this.http.get<AdjInvoiceOption[]>('/api/v1/payments/adjustment/invoices',
      { params: new HttpParams().set('accountId', String(accountId)) });
  }

  createAdjustment(body: {
    accountId: number; kind: 'ADDITIONAL' | 'REDUCTION'; amount: number;
    targetInvoiceId?: number | null; remarks: string; sourceRef: string;
  }): Observable<{ documentId: number; docType: string; message: string }> {
    return this.http.post<{ documentId: number; docType: string; message: string }>(
      '/api/v1/payments/adjustment', body);
  }

  myHistory(opts: { type: string; from?: string; to?: string; q?: string; page: number; size: number }): Observable<HistoryResponse> {
    let params = new HttpParams()
      .set('type', opts.type).set('page', String(opts.page)).set('size', String(opts.size));
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to)   params = params.set('to', opts.to);
    if (opts.q)    params = params.set('q', opts.q);
    return this.http.get<HistoryResponse>(`${this.base}/my/history`, { params });
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

  usage(accountId: number): Observable<UsageCharge[]> {
    return this.http.get<UsageCharge[]>(`${this.base}/${accountId}/usage`);
  }

  /**
   * Padam caj yang BELUM dibil.
   *
   * Caj yang sudah dibil ditolak oleh backend — ia menjadi baris
   * invois, dan memadamnya meninggalkan invois tanpa asal.
   */
  padamUsage(accountId: number, usageId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/${accountId}/usage/${usageId}`);
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

/**
 * Sub-baris padanan — resit ini membayar invois itu (ADR 0010).
 * TIDAK menggerakkan lajur baki: alokasi ialah padanan, bukan
 * pergerakan baki (ADR 0009).
 */
export interface StatementMatch {
  docNo: string; item: string | null;
  /** Catatan baris — caj penggunaan sahaja; null untuk langganan. */
  remarks: string | null;
  period: string | null; amount: number;
}

/**
 * Satu baris = SATU DOKUMEN, bukan satu alokasi.
 *
 * amount bertanda: positif menaikkan baki, negatif menurunkannya.
 * Dokumen batal mempunyai amount SIFAR — dipapar tetapi tidak
 * menggerakkan baki.
 */
export interface StatementLine {
  date: string; docNo: string; docType: string; item: string;
  remark: string | null;
  /**
   * Catatan baris — BERASINGAN daripada remark, yang memegang sebab
   * pembatalan. Hanya untuk dokumen satu baris; invois berbilang baris
   * membawa catatan pada sub-barisnya.
   */
  lineRemarks: string | null;
  cancelled: boolean;
  amount: number; balance: number;
  matches: StatementMatch[];
}
export interface StatementResponse {
  accountId: number; accountNo: string; accountName: string;
  year: number | null;
  openingBalance: number; closingBalance: number; arrears: number;
  total: number; page: number; size: number;
  lines: StatementLine[];
}

export interface PaymentReportRow {
  period: string; invoice: string; invAmount: number; receipts: string | null;
}
export interface PaymentReportResponse {
  items: PaymentReportRow[]; total: number; page: number; pageSize: number;
}

export interface MyAccountRow {
  id: number; spCode: string; spName: string;
  accountNo: string; accountName: string;
  /** Boleh NEGATIF — negatif bermakna pelanggan ada KREDIT (ADR 0009). */
  balance: number;
  /** Invois belum berbayar. TIDAK boleh negatif. Dikira di backend. */
  arrears: number;
  latestInvoiceAmount: number | null; dueDate: string | null;
}

export interface HistoryRow {
  id: number;
  date: string; docType: string; spName: string;
  accountNo: string; docNo: string; amount: number;
}
export interface HistoryResponse {
  items: HistoryRow[]; total: number; page: number; pageSize: number;
}

export interface AdjInvoiceOption {
  id: number; docNo: string; outstanding: number;
  /**
   * Keterangan invois SATU baris; null kalau berbilang.
   *
   * Kerani yang melihat 'I2600119 — baki MYR 8.67' tidak tahu itu
   * invois apa, dan penyata di sebelahnya menamakannya.
   */
  description: string | null;
}


// ---------------------------------------------------------------------------
// Bayaran dalam talian
// ---------------------------------------------------------------------------

export interface OnlineOutstanding {
  documentId: number; docNo: string; period: string | null;
  dueDate: string | null; total: number; balance: number; overdue: boolean;
}

export interface PaymentStarted {
  ourRef: string; billCode: string; paymentUrl: string; amount: number;
}

export interface PaymentStatus {
  status: string; amount: number; paidAmount: number | null;
  gatewayRef: string | null; paymentId: number | null;
}
