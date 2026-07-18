import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warn';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  detail?: string;
}

/**
 * Pemberitahuan ringkas di penjuru skrin.
 * Hilang sendiri selepas 7 saat (boleh ditutup lebih awal).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private static readonly TTL = 7000;
  private seq = 0;

  readonly toasts = signal<Toast[]>([]);

  success(message: string, detail?: string) { this.push('success', message, detail); }
  error(message: string, detail?: string)   { this.push('error', message, detail); }
  info(message: string, detail?: string)    { this.push('info', message, detail); }
  warn(message: string, detail?: string)    { this.push('warn', message, detail); }

  dismiss(id: number) {
    this.toasts.set(this.toasts().filter(t => t.id !== id));
  }

  private push(kind: ToastKind, message: string, detail?: string) {
    const id = ++this.seq;
    this.toasts.set([...this.toasts(), { id, kind, message, detail }]);
    setTimeout(() => this.dismiss(id), ToastService.TTL);
  }
}
