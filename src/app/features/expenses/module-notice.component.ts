import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleService } from '../../core/services/module.service';

/**
 * Sepanduk 'belum dilanggan' untuk skrin modul Perbelanjaan.
 *
 * Muncul hanya apabila SP tiada hak. Skrin tetap boleh dibuka dan data
 * sedia ada tetap kelihatan — 'benarkan masuk, sekat transaksi'
 * (ADR 0016) — tetapi pengguna diberitahu SEBELUM menekan butang yang
 * akan ditolak.
 */
@Component({
  selector: 'app-exp-notice',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (modules.loaded() && !modules.hasPerbelanjaan()) {
      <div class="panecard" style="margin-top:0;border-left:4px solid var(--blue);
                                   display:flex;gap:14px;align-items:flex-start">
        <span style="font-size:20px;line-height:1">🔒</span>
        <div>
          <div style="font-family:'Sora',sans-serif;font-weight:700;color:var(--ink);
                      margin-bottom:4px">
            Modul Perbelanjaan belum dilanggan
          </div>
          <div style="font-size:13.5px;color:var(--body)">
            Anda boleh melihat skrin ini, tetapi tidak boleh merekod atau mengubah data.
            Hubungi admin organisasi untuk memohon modul ini.
          </div>
        </div>
      </div>
    }
  `
})
export class ExpNoticeComponent {
  readonly modules = inject(ModuleService);
}
