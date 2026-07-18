import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface SpRole { code: string; name: string; description?: string; }

export interface Member {
  id: number; userId: number; email: string; fullName: string;
  role: string; roleName: string; status: string; joinedAt?: string;
}

/** Medan tepat dari design: Tetapan ▸ Profile */
export interface Profile {
  spCode?: string; logoUrl?: string;
  businessType?: string; businessDesc?: string;
  name: string; registrationNo?: string;
  address?: string; postcode?: string; state?: string; country?: string;
  website?: string; officeNo?: string; mobileNo?: string;
  helpdeskEmail?: string; helpdeskPhone?: string; contactEmail?: string;
  bankCode?: string; bankAccountNo?: string; bankAccountName?: string;
  status?: string; orgRegisteredDate?: string;
}

export interface Billing {
  // Localization
  currency?: string; language?: string; dateFormat?: string; timeFormat?: string;
  // Payment term — dipapar dalam tab Invoice
  paymentTermDays?: number;
  // Rekod Cukai
  taxName?: string; taxRate?: number; taxId?: string;
  // Tax Invoice (e-Invois) — berkuatkuasa Jan 2027
  enableTaxInvoice?: boolean; tin?: string; sstRegistrationNo?: string;
  taxEffectiveDate?: string; msicCode?: string;
  einvoiceType?: string; einvoiceClassification?: string;
}

export interface DocumentSetting {
  // Invoice Setting
  invoiceTitle?: string; invoicePrefix?: string;
  invoiceNoSize?: number; invoiceNoStart?: number;
  invoiceGenMode?: string; invoiceGenFreq?: string; invoiceGenDay?: number;
  invoiceTemplateId?: string; splitInvoiceByProduct?: boolean;
  // Notifikasi — dipapar dalam tab Invoice
  smsOnInvoice?: boolean; smsOnReminder?: boolean;
  whatsappOnInvoice?: boolean; whatsappOnReminder?: boolean;
  // Receipt Setting
  receiptTitle?: string; receiptPrefix?: string;
  receiptNoSize?: number; receiptNoStart?: number; receiptTemplateId?: string;
  enableManualPayment?: boolean;
  // Statement
  statementTitle?: string; statementTemplateId?: string;
}

export interface Penalty {
  enabled?: boolean; penaltyCode?: string; penaltyTitle?: string; penaltyDesc?: string;
  penaltyAmount?: number; penaltyAfterDay?: number; taxable?: boolean;
  penaltyType?: string; compounded?: boolean;
}

export interface PlanInfo {
  planName?: string; accountLimit?: number; accountUsed: number;
  billingPlan?: string; price?: number; estInvoicesMonth?: number;
}

export interface Lookup { id: number; code: string; name: string; }
export interface Branch { id: number; code: string; name: string; address?: string; }
export interface Branch { id: number; code: string; name: string; address?: string; }
export interface BusinessType { code: string; name: string; description?: string; }
export interface ExcludePeriod { id: number; period: string; remarks?: string; }

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private base = '/api/v1/settings';

  // roles & members
  roles(): Observable<SpRole[]> { return this.http.get<SpRole[]>(`${this.base}/roles`); }
  members(): Observable<Member[]> { return this.http.get<Member[]>(`${this.base}/members`); }
  addMember(email: string, role: string) {
    return this.http.post<{ message: string }>(`${this.base}/members`, { email, role });
  }
  changeRole(id: number, role: string) {
    return this.http.patch<{ message: string }>(`${this.base}/members/${id}`, { role });
  }
  removeMember(id: number) {
    return this.http.delete<{ message: string }>(`${this.base}/members/${id}`);
  }

  businessTypes(): Observable<BusinessType[]> {
    return this.http.get<BusinessType[]>(`${this.base}/business-types`);
  }

  // profile
  profile(): Observable<Profile> { return this.http.get<Profile>(`${this.base}/profile`); }
  saveProfile(p: Profile) { return this.http.put<{ message: string }>(`${this.base}/profile`, p); }

  // billing (sales tax + localization)
  billing(): Observable<Billing> { return this.http.get<Billing>(`${this.base}/billing`); }
  saveBilling(b: Billing) { return this.http.put<{ message: string }>(`${this.base}/billing`, b); }

  // document (invoice + receipt + statement)
  document(): Observable<DocumentSetting> { return this.http.get<DocumentSetting>(`${this.base}/document`); }
  saveDocument(d: DocumentSetting) { return this.http.put<{ message: string }>(`${this.base}/document`, d); }

  // penalty
  penalty(): Observable<Penalty> { return this.http.get<Penalty>(`${this.base}/penalty`); }
  savePenalty(p: Penalty) { return this.http.put<{ message: string }>(`${this.base}/penalty`, p); }

  // plan (baca sahaja)
  plan(): Observable<PlanInfo> { return this.http.get<PlanInfo>(`${this.base}/plan`); }

  // lookups
  accountCategories(): Observable<Lookup[]> { return this.http.get<Lookup[]>(`${this.base}/account-categories`); }
  addAccountCategory(code: string, name: string) {
    return this.http.post<{ message: string }>(`${this.base}/account-categories`, { code, name });
  }
  delAccountCategory(id: number) {
    return this.http.delete<{ message: string }>(`${this.base}/account-categories/${id}`);
  }

  productCategories(): Observable<Lookup[]> { return this.http.get<Lookup[]>(`${this.base}/product-categories`); }
  addProductCategory(code: string, name: string) {
    return this.http.post<{ message: string }>(`${this.base}/product-categories`, { code, name });
  }
  delProductCategory(id: number) {
    return this.http.delete<{ message: string }>(`${this.base}/product-categories/${id}`);
  }

  branches(): Observable<Branch[]> { return this.http.get<Branch[]>(`${this.base}/branches`); }
  addBranch(code: string, name: string, address?: string) {
    return this.http.post<{ message: string }>(`${this.base}/branches`, { code, name, address });
  }
  delBranch(id: number) { return this.http.delete<{ message: string }>(`${this.base}/branches/${id}`); }

  excludePeriods(): Observable<ExcludePeriod[]> {
    return this.http.get<ExcludePeriod[]>(`${this.base}/exclude-periods`);
  }
  addExclude(period: string, remarks?: string) {
    return this.http.post<{ message: string }>(`${this.base}/exclude-periods`, { period, remarks });
  }
  delExclude(id: number) {
    return this.http.delete<{ message: string }>(`${this.base}/exclude-periods/${id}`);
  }
}
