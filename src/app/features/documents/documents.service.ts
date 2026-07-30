import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
// Page<T> hidup dalam product.model.ts — nama fail yang mengelirukan,
// tetapi ia corak sedia ada dan semua ciri lain mengimportnya dari situ.
import { Page } from '../../core/models/product.model';

export interface DocumentRow {
  id: number;
  docNo: string;
  /** Label jenis daripada tetapan SP — 'Invois', 'RESIT'. */
  title: string;
  /** INVOICE | RECEIPT | DEBIT_NOTE | CREDIT_NOTE */
  docType: string;
  accountNo: string;
  issuedTo: string;
  docDate: string;
  period: string;
  status: string;
  amount: number;
  paymentRefNo: string;
}

export interface LineRow {
  productCode: string;
  description: string;
  quantity: number;
  taxAmount: number;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface DocumentSearch {
  docNo?: string | null;
  account?: string | null;
  periodId?: number | null;
  docType?: string | null;
  paymentRefNo?: string | null;
  issuedFrom?: string | null;
  issuedTo?: string | null;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private http = inject(HttpClient);
  private base = '/api/v1/documents';

  search(f: DocumentSearch): Observable<Page<DocumentRow>> {
    let p = new HttpParams()
      .set('page', String(f.page ?? 0))
      .set('size', String(f.size ?? 10));

    const tambah = (k: string, v: unknown) => {
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        p = p.set(k, String(v).trim());
      }
    };
    tambah('docNo', f.docNo);
    tambah('account', f.account);
    tambah('periodId', f.periodId);
    tambah('docType', f.docType);
    tambah('paymentRefNo', f.paymentRefNo);
    tambah('issuedFrom', f.issuedFrom);
    tambah('issuedTo', f.issuedTo);

    return this.http.get<Page<DocumentRow>>(this.base, { params: p });
  }

  /** Baris dokumen — modal 'List of Transaction'. */
  lines(id: number): Observable<LineRow[]> {
    return this.http.get<LineRow[]>(`${this.base}/${id}/lines`);
  }

  /**
   * PDF dokumen. Interceptor menyisipkan Authorization dan X-SP-Id, jadi
   * ini tidak boleh menjadi <a href> biasa.
   *
   * Resit dan invois mempunyai endpoint berbeza — jenis menentukan yang
   * mana. Nota debit menggunakan laluan invois; ia invois dari sudut
   * pelanggan.
   */
  pdf(row: DocumentRow): Observable<HttpResponse<Blob>> {
    const laluan = row.docType === 'RECEIPT'
      ? `/api/v1/statements/receipts/${row.id}`
      : `/api/v1/statements/invoices/${row.id}`;
    return this.http.get(laluan, { responseType: 'blob', observe: 'response' });
  }

  /**
   * Batal dokumen. Sebab WAJIB — lajur cancel_reason wujud sejak V1
   * tetapi tidak pernah diisi sebelum ini.
   *
   * SP_ADMIN sahaja: kerani menerima duit, admin membatalkannya.
   */
  cancel(id: number, reason: string): Observable<{ docNo: string; status: string }> {
    return this.http.post<{ docNo: string; status: string }>(
      `/api/v1/payments/documents/${id}/cancel`, { reason });
  }

  /** Hantar semula kepada satu atau lebih alamat. */
  resend(id: number, emails: string[]): Observable<{ sent: number; recipients: string[] }> {
    return this.http.post<{ sent: number; recipients: string[] }>(
      `/api/v1/statements/documents/${id}/resend`, { emails });
  }
}
