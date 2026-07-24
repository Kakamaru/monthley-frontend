import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface GenerateRequest {
  period?: string | null;   // 'YYYY-MM'
  mode?: 'CURRENT' | 'PREPAID' | 'POSTPAID';
  taxRate?: number | null;
  minDenom?: number | null;
}

export interface GenerateResult {
  spCode: string;
  period: string;
  mode: string;
  accountsScanned: number;
  skippedNoSubscription: number;
  skippedNothingToCharge: number;
  skippedAlreadyGenerated: number;
  billedPeriods: string[];   // tempoh SEBENAR dibilkan (bukan bulan larian)
  invoicesPosted: number;
}

@Injectable({ providedIn: 'root' })
export class InvoicingService {
  private http = inject(HttpClient);

  generate(body: GenerateRequest): Observable<GenerateResult> {
    return this.http.post<GenerateResult>('/api/v1/tools/generate-invoices', body);
  }

  generateSingle(body: { accountId: number; period?: string | null; mode?: string | null }): Observable<GenerateSingleResult> {
    return this.http.post<GenerateSingleResult>('/api/v1/tools/generate-single', body);
  }
}

export interface GenerateSingleResult {
  accountId: number;
  period: string;
  mode: string;
  invoicesPosted: number;
}
