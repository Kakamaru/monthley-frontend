import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const KEY = 'monthley-sp';

/**
 * SP terpilih (sp_code) — dihantar sebagai header X-SP-Id.
 * Diambil dari sesi log masuk; boleh tukar jika pengguna ada banyak SP.
 */
@Injectable({ providedIn: 'root' })
export class SpContextService {
  private auth = inject(AuthService);

  private readonly selected = signal<string | null>(this.restore());

  /** SP unik — pengguna boleh ada beberapa peranan dalam SP yang sama. */
  readonly uniqueSps = computed(() => {
    const seen = new Map<string, { spCode: string; spName: string; roles: string[] }>();
    for (const a of this.auth.spAccess()) {
      const cur = seen.get(a.spCode);
      if (cur) { cur.roles.push(a.role); }
      else { seen.set(a.spCode, { spCode: a.spCode, spName: a.spName, roles: [a.role] }); }
    }
    return [...seen.values()];
  });

  /** SP semasa — pilihan pengguna, atau SP pertama yang dia ada akses. */
  readonly currentSp = computed<string>(() => {
    const list = this.uniqueSps();
    const sel = this.selected();
    if (sel && list.some(a => a.spCode === sel)) return sel;
    return list[0]?.spCode ?? '';
  });

  readonly spName = computed<string>(() => {
    const code = this.currentSp();
    return this.uniqueSps().find(a => a.spCode === code)?.spName ?? '—';
  });

  /** Peranan pengguna dalam SP semasa (boleh lebih dari satu). */
  readonly currentRoles = computed<string[]>(() => {
    const code = this.currentSp();
    return this.uniqueSps().find(a => a.spCode === code)?.roles ?? [];
  });

  readonly hasMultipleSp = computed(() => this.uniqueSps().length > 1);

  constructor() {
    effect(() => {
      const c = this.currentSp();
      if (c) { try { localStorage.setItem(KEY, c); } catch { /* abaikan */ } }
    });
  }

  setSp(spCode: string) { this.selected.set(spCode); }

  private restore(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
}
