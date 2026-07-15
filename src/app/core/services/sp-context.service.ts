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

  /** SP semasa — pilihan pengguna, atau SP pertama yang dia ada akses. */
  readonly currentSp = computed<string>(() => {
    const list = this.auth.spAccess();
    const sel = this.selected();
    if (sel && list.some(a => a.spCode === sel)) return sel;
    return list[0]?.spCode ?? '';
  });

  readonly spName = computed<string>(() => {
    const code = this.currentSp();
    return this.auth.spAccess().find(a => a.spCode === code)?.spName ?? '—';
  });

  readonly hasMultipleSp = computed(() => this.auth.spAccess().length > 1);

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
