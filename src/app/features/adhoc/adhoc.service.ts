import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Invois adhoc — kepada orang yang BUKAN pelanggan berdaftar.
 *
 * Caj clamp kepada pemandu luar; jualan buku pada pameran sekolah.
 * Semua berkongsi satu akaun ADHOC-SALES per SP (V50), dan butiran
 * penerima duduk pada dokumen.
 */
export interface AdhocLine {
  productId: number;
  quantity: number;
}

export interface AdhocRequest {
  /** Akaun sedia ada jika penerima MEMANG pelanggan; null untuk orang luar. */
  accountId: number | null;
  issuedToName: string;
  issuedToEmail: string | null;
  issuedToPhone: string | null;
  periodId: number;
  dueDate: string;
  remarks: string | null;
  lines: AdhocLine[];
}

export interface AdhocResult {
  documentId: number;
  docNo: string;
  total: number;
}

/** Butiran untuk skrin kejayaan — disimpan sebelum borang dikosongkan. */
export interface AdhocSiap {
  documentId: number;
  docNo: string;
  issuedTo: string;
  issuedDate: string;
  total: number;
}

export interface PeriodOption {
  periodId: number;
  name: string;
  startDt: string;
}

@Injectable({ providedIn: 'root' })
export class AdhocService {
  private http = inject(HttpClient);

  create(body: AdhocRequest): Observable<AdhocResult> {
    return this.http.post<AdhocResult>('/api/v1/tools/adhoc-invoice', body);
  }

  /**
   * PDF invois. Interceptor menyisipkan Authorization dan X-SP-Id, jadi
   * ini tidak boleh menjadi <a href> biasa.
   */
  pdf(documentId: number) {
    return this.http.get(`/api/v1/statements/invoices/${documentId}`,
      { responseType: 'blob', observe: 'response' as const });
  }

  /** Tempoh BULANAN sahaja — enam bulan ke belakang, dua belas ke hadapan. */
  periods(): Observable<PeriodOption[]> {
    return this.http.get<PeriodOption[]>('/api/v1/tools/periods');
  }
}
