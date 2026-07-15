import { Injectable, signal } from '@angular/core';

/**
 * SP terpilih (sp_code) — dihantar sebagai header X-SP-Id pada setiap request.
 * Buat sekarang tetap SW01; nanti dari /me selepas login (handoff §5).
 */
@Injectable({ providedIn: 'root' })
export class SpContextService {
  readonly currentSp = signal<string>('SW01');
  readonly spName = signal<string>('Perbadanan Pengurusan Serai Wangi');

  setSp(spCode: string, name: string) {
    this.currentSp.set(spCode);
    this.spName.set(name);
  }
}
