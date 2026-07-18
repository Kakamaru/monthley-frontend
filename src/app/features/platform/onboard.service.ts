import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ServicePlan {
  id: number; code: string; name: string;
  accountLimit: number; priceMonthly: number; priceYearly: number;
}

export interface BusinessType { code: string; name: string; description?: string; }

export interface GeneratedKey { merchantId: string; gatewayKey: string; }

export interface OnboardRequest {
  name: string; businessType?: string; registrationNo?: string; businessDesc?: string; website?: string;
  addrLine1?: string; addrLine2?: string; city?: string; postcode?: string;
  state?: string; country?: string; orgRegisteredDate?: string;
  servicePlanId?: number | null; billingPlan?: 'MONTHLY' | 'YEARLY';
  estInvoicesMonth?: number | null;
  contactName: string; adminEmail: string; contactPhone?: string;
  absorb: boolean; merchantId?: string; gatewayKey?: string;
  bankName?: string; bankAccountNo?: string; bankAccountName?: string;
}

export interface OnboardResult {
  spCode: string; name: string; adminUserId: number; adminEmail: string;
}

@Injectable({ providedIn: 'root' })
export class OnboardService {
  private http = inject(HttpClient);
  private base = '/api/v1/platform';

  plans(): Observable<ServicePlan[]> {
    return this.http.get<ServicePlan[]>(`${this.base}/service-plans`);
  }

  businessTypes(): Observable<BusinessType[]> {
    return this.http.get<BusinessType[]>(`${this.base}/business-types`);
  }

  generateKey(): Observable<GeneratedKey> {
    return this.http.post<GeneratedKey>(`${this.base}/generate-key`, {});
  }

  onboard(body: OnboardRequest): Observable<OnboardResult> {
    return this.http.post<OnboardResult>(`${this.base}/onboard`, body);
  }
}
