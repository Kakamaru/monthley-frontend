import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SpContextService } from './sp-context.service';

export interface ModuleStatus {
  code: string; name: string; active: boolean;
  description: string | null; videoUrl: string | null;
}

/**
 * Hak modul untuk SP semasa.
 *
 * Digunakan untuk 'benarkan masuk, sekat transaksi' (ADR 0016): menu dan
 * skrin kekal boleh dibuka supaya SP nampak apa yang ditawarkan, tetapi
 * butang tulis dikunci dan sebabnya dinyatakan.
 *
 * Ini BUKAN penguatkuasaan — ModuleGuard di backend yang menolak tulis.
 * Ia hanya menjadikan penolakan itu boleh dijangka dan bukan mengejut.
 */
@Injectable({ providedIn: 'root' })
export class ModuleService {
  private http = inject(HttpClient);
  private sp = inject(SpContextService);

  readonly modules = signal<ModuleStatus[]>([]);
  readonly loaded = signal(false);

  constructor() {
    // Hak ialah per SP, jadi ia dimuatkan semula setiap kali SP bertukar.
    effect(() => {
      const kod = this.sp.currentSp();
      if (!kod) { this.modules.set([]); return; }
      this.refresh();
    });
  }

  refresh() {
    this.http.get<ModuleStatus[]>('/api/v1/modules').subscribe({
      next: m => { this.modules.set(m); this.loaded.set(true); },
      error: () => { this.modules.set([]); this.loaded.set(true); }
    });
  }

  /** Adakah SP semasa melanggan modul ini? */
  has(code: string): boolean {
    return this.modules().some(m => m.code === code && m.active);
  }

  info(code: string): ModuleStatus | undefined {
    return this.modules().find(m => m.code === code);
  }

  readonly hasPerbelanjaan = computed(() =>
    this.modules().some(m => m.code === 'PERBELANJAAN' && m.active));
}
