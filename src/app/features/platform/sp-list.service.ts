import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../../core/models/product.model';

export interface SpRow {
  spCode: string; name: string;
  bizType?: string; bizTypeName?: string;
  state?: string; city?: string; status: string;
  planName?: string; accountLimit?: number; accountCount: number;
  price?: number;
  adminEmail?: string; approvedAt?: string;
}

export interface SpSummary { total: number; active: number; pending: number; suspended: number; }

export interface SpQuery {
  q?: string | null; bizType?: string | null; status?: string | null;
  plan?: number | null; state?: string | null; page: number; size: number;
}

@Injectable({ providedIn: 'root' })
export class SpListService {
  private http = inject(HttpClient);
  private base = '/api/v1/platform/service-providers';

  list(query: SpQuery): Observable<Page<SpRow>> {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('size', String(query.size));
    if (query.q)       params = params.set('q', query.q);
    if (query.bizType) params = params.set('bizType', query.bizType);
    if (query.status)  params = params.set('status', query.status);
    if (query.plan)    params = params.set('plan', String(query.plan));
    if (query.state)   params = params.set('state', query.state);
    return this.http.get<Page<SpRow>>(this.base, { params });
  }

  summary(): Observable<SpSummary> {
    return this.http.get<SpSummary>(`${this.base}/summary`);
  }

  profile(spCode: string): Observable<SpProfile> {
    return this.http.get<SpProfile>(`${this.base}/${spCode}`);
  }

  /**
   * Kemas kini profil SAHAJA.
   *
   * Pelan dan modul tidak dihantar di sini — ia melalui sp_change_request
   * dengan kelulusan (ADR 0016). Dua laluan menukar pelan bermakna satu
   * daripadanya memintas rekod permohonan.
   */
  saveProfile(spCode: string, body: Partial<SpProfile>): Observable<unknown> {
    return this.http.put(`${this.base}/${spCode}`, body);
  }

  changeStatus(spCode: string, status: string): Observable<unknown> {
    return this.http.patch(`${this.base}/${spCode}/status`, { status });
  }
}

export interface SpProfile {
  spCode: string; name: string; handle: string | null;
  businessType: string | null; businessDesc: string | null;
  registrationNo: string | null; orgRegisteredDate: string | null;
  website: string | null;
  addrLine1: string | null; addrLine2: string | null; addrLine3: string | null;
  city: string | null; postcode: string | null; state: string | null;
  country: string | null;
  phone: string | null; officeNo: string | null; mobileNo: string | null;
  contactEmail: string | null; helpdeskEmail: string | null;
  helpdeskPhone: string | null;
  bankCode: string | null; bankAccountNo: string | null;
  bankAccountName: string | null;
  estInvoicesMonth: number | null; minPymtAmount: number | null;
  allowSelective: boolean; minDenom: number | null;
  status: string;
  /** Baca sahaja — ditukar melalui sp_change_request. */
  planProductId: number | null; planName: string | null; planPrice: number | null;
  accountLimit: number | null; accountCount: number;
}
