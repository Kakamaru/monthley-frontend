import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Satu baris daripada fail muat naik, sudah dipadankan dengan akaun. */
export interface UsageBaris {
  accountId: number | null;
  accountNo: string;
  accountName: string;
  remarks: string | null;
  quantity: number;
  amount: number;
  /** Null bermakna baris boleh disimpan. */
  masalah: string | null;
}

export interface UsageSimpanHasil {
  disimpan: number;
  /** Pendua atau baris tidak sah — dilangkau, bukan menggagalkan kelompok. */
  dilangkau: number;
  sebab: string[];
}

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private http = inject(HttpClient);
  private base = '/api/v1/tools';

  /**
   * Templat Excel dengan senarai akaun aktif.
   *
   * Interceptor menyisipkan Authorization dan X-SP-Id, jadi ini tidak
   * boleh menjadi <a href> biasa.
   */
  templat() {
    return this.http.get(`${this.base}/usage/template`,
      { responseType: 'blob', observe: 'response' as const });
  }

  /** Baca fail — TIDAK menyimpan. Kerani menyemak dahulu. */
  pratonton(file: File, productId: number): Observable<UsageBaris[]> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<UsageBaris[]>(`${this.base}/usage/preview`, fd,
      { params: new HttpParams().set('productId', String(productId)) });
  }

  simpan(productId: number, periodId: number,
         lines: UsageBaris[]): Observable<UsageSimpanHasil> {
    return this.http.post<UsageSimpanHasil>(`${this.base}/usage`,
      { productId, periodId, lines });
  }
}
