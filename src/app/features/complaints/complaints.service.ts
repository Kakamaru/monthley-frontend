import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../../core/models/product.model';

// ---------- Model ----------

export interface AduCategory {
  id: number; name: string; sortOrder: number; active: boolean; used: number;
}

export interface ComplaintRow {
  id: number; complaintNo: string; subject: string;
  accountNo: string; accountName: string; reporterName: string | null;
  categoryName: string | null; priority: string; status: string;
  createdAt: string; assignedName: string | null;
  ageDays: number; overSla: boolean;
}

export interface ReplyRow {
  id: number; message: string; byName: string | null;
  fromSp: boolean; internal: boolean; createdAt: string;
}

export interface ComplaintDetail {
  header: ComplaintRow; detail: string | null; reporterPhone: string | null;
  internalNote: string | null; categoryId: number | null;
  assignedTo: number | null; replies: ReplyRow[];
}

export interface Assignee { id: number; name: string; email: string; }

/**
 * Bentuk AccountDto dari modul Akaun — medannya 'no' dan 'name', bukan
 * accountNo/accountName. Endpoint akaun sedia ada diguna semula kerana
 * penapisan nama, nombor, dan kategori sudah ada di sana; endpoint baharu
 * dalam modul Aduan bermakna dua senarai akaun yang akan menyimpang.
 */
export interface AccountOption { id: number; no: string; name: string; }

export interface AduSetting {
  prefix: string; noSize: number; noStart: number; slaDays: number;
}

export interface TrendPoint { label: string; received: number; resolved: number; }
export interface CategoryCount { name: string; count: number; }
export interface UrgentRow {
  id: number; complaintNo: string; subject: string; accountNo: string;
  categoryName: string | null; priority: string; ageDays: number; overSla: boolean;
}
export interface AduDashboard {
  total: number; baru: number; dalamProses: number; selesai: number;
  dibukaSemula: number; melebihiSla: number;
  kadarSelesai: number; purataMaklumBalasJam: number; purataSelesaiHari: number;
  trend: TrendPoint[]; byCategory: CategoryCount[]; urgent: UrgentRow[];
  slaDays: number;
}

export interface ComplaintFilter {
  status?: string | null; category?: number | null; priority?: string | null;
  q?: string | null; from?: string | null; to?: string | null;
}

// ---------- Pelanggan ----------

export interface MyComplaintRow {
  id: number; complaintNo: string; subject: string;
  spName: string; accountNo: string; categoryName: string | null;
  status: string; createdAt: string;
}

export interface MyReply {
  message: string; byName: string | null; fromSp: boolean; createdAt: string;
}

export interface MyDetail {
  header: MyComplaintRow; detail: string | null;
  replies: MyReply[]; canReply: boolean;
}

export interface MyAccount {
  accountId: number; accountNo: string; accountName: string;
  spCode: string; spName: string;
}

// ---------- Servis ----------

@Injectable({ providedIn: 'root' })
export class ComplaintsService {
  private http = inject(HttpClient);
  private base = '/api/v1/complaints';

  list(f: ComplaintFilter, page: number, size: number): Observable<Page<ComplaintRow>> {
    let p = new HttpParams().set('page', String(page)).set('size', String(size));
    if (f.status && f.status !== 'ALL') p = p.set('status', f.status);
    if (f.category) p = p.set('category', String(f.category));
    if (f.priority && f.priority !== 'ALL') p = p.set('priority', f.priority);
    if (f.q) p = p.set('q', f.q);
    if (f.from) p = p.set('from', f.from);
    if (f.to) p = p.set('to', f.to);
    return this.http.get<Page<ComplaintRow>>(this.base, { params: p });
  }

  get(id: number): Observable<ComplaintDetail> {
    return this.http.get<ComplaintDetail>(`${this.base}/${id}`);
  }

  create(body: unknown): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, body);
  }

  reply(id: number, body: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/reply`, body);
  }

  assignees(): Observable<Assignee[]> {
    return this.http.get<Assignee[]>(`${this.base}/assignees`);
  }

  dashboard(): Observable<AduDashboard> {
    return this.http.get<AduDashboard>(`${this.base}/dashboard`);
  }

  categories(): Observable<AduCategory[]> {
    return this.http.get<AduCategory[]>(`${this.base}/categories`);
  }
  saveCategory(body: Partial<AduCategory>, id?: number): Observable<unknown> {
    return id
      ? this.http.put(`${this.base}/categories/${id}`, body)
      : this.http.post(`${this.base}/categories`, body);
  }
  deactivateCategory(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/categories/${id}`);
  }

  settings(): Observable<AduSetting> {
    return this.http.get<AduSetting>(`${this.base}/settings`);
  }
  saveSettings(body: AduSetting): Observable<AduSetting> {
    return this.http.put<AduSetting>(`${this.base}/settings`, body);
  }

  // ---------- Pelanggan (merentas SP) ----------

  myAccounts(): Observable<MyAccount[]> {
    return this.http.get<MyAccount[]>('/api/v1/my-complaints/accounts');
  }

  myCategories(accountId: number): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(
      '/api/v1/my-complaints/categories',
      { params: new HttpParams().set('accountId', String(accountId)) });
  }

  myList(status: string | null): Observable<MyComplaintRow[]> {
    let p = new HttpParams();
    if (status && status !== 'ALL') p = p.set('status', status);
    return this.http.get<MyComplaintRow[]>('/api/v1/my-complaints', { params: p });
  }

  myGet(id: number): Observable<MyDetail> {
    return this.http.get<MyDetail>(`/api/v1/my-complaints/${id}`);
  }

  myCreate(body: unknown): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/v1/my-complaints', body);
  }

  myReply(id: number, message: string): Observable<unknown> {
    return this.http.post(`/api/v1/my-complaints/${id}/reply`, { message });
  }

  /** Akaun SP — untuk kerani merekod aduan telefon. */
  accounts(q: string): Observable<Page<AccountOption>> {
    return this.http.get<Page<AccountOption>>(
      '/api/v1/accounts', { params: new HttpParams().set('q', q).set('size', '20') });
  }
}
