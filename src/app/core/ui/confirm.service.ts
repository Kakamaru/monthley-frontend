import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;      // merah — untuk padam
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * Dialog pengesahan Ya/Tidak.
 * Guna: if (await confirm.ask({...})) { … }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<Pending | null>(null);

  ask(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.pending.set({ ...opts, resolve });
    });
  }

  /** Pintasan untuk padam — nada amaran. */
  askDelete(what: string, detail?: string): Promise<boolean> {
    return this.ask({
      title: 'Sahkan Pembuangan',
      message: `Buang ${what}?`,
      detail: detail ?? 'Tindakan ini tidak boleh dibatalkan.',
      confirmText: 'Ya, Buang',
      cancelText: 'Tidak',
      danger: true
    });
  }

  answer(ok: boolean) {
    const p = this.pending();
    if (p) { p.resolve(ok); this.pending.set(null); }
  }
}
