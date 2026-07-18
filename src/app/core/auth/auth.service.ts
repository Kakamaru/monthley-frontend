import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse, RegisterRequest, SpAccess } from './auth.model';

const KEY = 'monthley-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly session = signal<LoginResponse | null>(this.restore());

  readonly isLoggedIn   = computed(() => this.session() !== null);
  readonly isSuperadmin = computed(() => this.session()?.superadmin === true);
  readonly spAccess     = computed<SpAccess[]>(() => this.session()?.spAccess ?? []);
  readonly isSpAdmin    = computed(() => this.spAccess().length > 0);
  readonly hasAccounts  = computed(() => this.session()?.hasLinkedAccounts === true);
  readonly token        = computed(() => this.session()?.token ?? null);
  readonly displayName  = computed(() => this.session()?.fullName ?? '');

  login(id: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/login', { id, password })
      .pipe(tap(r => this.persist(r)));
  }

  /** Daftar — TIDAK log masuk. E-mel mesti disahkan dahulu. */
  register(body: RegisterRequest): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>('/api/v1/auth/register', body);
  }

  /** Sahkan e-mel dengan token dari pautan → terus log masuk. */
  verify(token: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/verify', { token })
      .pipe(tap(r => this.persist(r)));
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/resend-verification', { email });
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/forgot-password', { email });
  }

  /** Reset kata laluan dengan token → terus log masuk. */
  resetPassword(token: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/reset-password', { token, password })
      .pipe(tap(r => this.persist(r)));
  }

  logout() {
    this.session.set(null);
    try { localStorage.removeItem(KEY); } catch { /* abaikan */ }
    this.router.navigate(['/']);
  }

  /** Ke mana selepas log masuk — bergantung siapa dia. */
  landingRoute(): string {
    if (this.isSuperadmin()) return '/platform/service-providers';
    if (this.isSpAdmin())    return '/portal/products';
    return '/portal/my-accounts';
  }

  private persist(r: LoginResponse) {
    this.session.set(r);
    try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* abaikan */ }
  }

  private restore(): LoginResponse | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) as LoginResponse : null;
    } catch { return null; }
  }
}
