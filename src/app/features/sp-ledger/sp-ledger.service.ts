import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../../core/models/product.model';

/**
 * Satu baris lejar SP.
 *
 * balance ialah baki BERJALAN merentas semua akaun, dikira sebelum
 * tapisan — menapis 'Receipt' menyembunyikan baris, bukan mengubah
 * nombor.
 */
export interface SpLedgerRow {
  txnAt: string | null;
  accountNo: string;
  docType: string;
  docNo: string;
  item: string | null;
  remarks: string | null;
  period: string | null;
  amount: number;
  balance: number;
  cancelled: boolean;
}

export interface SpLedgerQuery {
  docNo?: string | null;
  productId?: number | null;
  docType?: string | null;
  periodId?: number | null;
  from?: string | null;
  to?: string | null;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class SpLedgerService {
  private http = inject(HttpClient);
  private base = '/api/v1/sp-ledger';

  list(q: SpLedgerQuery): Observable<Page<SpLedgerRow>> {
    let p = new HttpParams()
      .set('page', String(q.page))
      .set('size', String(q.size));

    if (q.docNo)      p = p.set('docNo', q.docNo);
    if (q.productId != null) p = p.set('productId', String(q.productId));
    if (q.docType)    p = p.set('docType', q.docType);
    if (q.periodId != null)  p = p.set('periodId', String(q.periodId));
    if (q.from)       p = p.set('from', q.from);
    if (q.to)         p = p.set('to', q.to);

    return this.http.get<Page<SpLedgerRow>>(this.base, { params: p });
  }
}
