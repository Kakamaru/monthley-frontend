import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Campaign {
  id: number;
  title: string;
  description: string | null;
  posterUrl: string | null;
  campaignType: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  startDate: string | null;
  endDate: string | null;
  targetAmount: number | null;
  presetAmounts: string | null;
  minAmount: number | null;
  allowCustom: boolean;
  requireName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  requireAccount: boolean;
  allowAnonymous: boolean;
  /** null = warisi tetapan SP (ADR 0020 #3). */
  absorbFee: boolean | null;
  autoReceipt: boolean;
  /** Dikira oleh backend — bukan lajur cache yang boleh menyimpang. */
  raised: number;
  donors: number;
}

export type SaveCampaign = Omit<Campaign, 'id' | 'raised' | 'donors'>;

@Injectable({ providedIn: 'root' })
export class DonationsService {
  private http = inject(HttpClient);
  private base = '/api/v1/donations';

  senarai(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.base}/campaigns`);
  }

  cipta(body: SaveCampaign): Observable<{ message: string; slug: string }> {
    return this.http.post<{ message: string; slug: string }>(
      `${this.base}/campaigns`, body);
  }

  kemasKini(id: number, body: SaveCampaign): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/campaigns/${id}`, body);
  }

  /**
   * Muat naik poster.
   *
   * FormData, bukan JSON: fail binari dalam JSON bermakna base64, yang
   * menambah sepertiga saiz dan memerlukan penyahkodan di backend.
   */
  muatNaikPoster(file: File): Observable<{ key: string; url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ key: string; url: string }>(
      `${this.base}/upload/poster`, fd);
  }
}
