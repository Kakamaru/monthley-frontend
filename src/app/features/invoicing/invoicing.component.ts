import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InvoicingService, GenerateResult } from './invoicing.service';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-invoicing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './invoicing.component.html'
})
export class InvoicingComponent {
  private api = inject(InvoicingService);
  private toast = inject(ToastService);

  readonly busy = signal(false);
  readonly result = signal<GenerateResult | null>(null);
  readonly error = signal<string | null>(null);

  /** Bulan semasa 'YYYY-MM' */
  readonly currentPeriod = new Date().toISOString().slice(0, 7);

  /** Bil seterusnya — 1 haribulan bulan hadapan */
  readonly nextRun = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    return d.toLocaleDateString('en-GB');
  })();

  generate() {
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    // mode tidak dihantar — backend guna cfg.genMode() dari tetapan SP
    this.api.generate({ period: this.currentPeriod }).subscribe({
      next: r => {
        this.result.set(r);
        this.busy.set(false);
        if (r.invoicesPosted > 0) {
          this.toast.success(`${r.invoicesPosted} invois dijana`, `Tempoh ${r.period}`);
        } else {
          this.toast.info('Tiada bil baharu',
            `Semua invois untuk ${r.period} sudah dijana — tiada pendua.`);
        }
      },
      error: e => {
        this.error.set('Gagal menjana bil. ' + (e?.error?.message ?? 'Semak backend.'));
        this.busy.set(false);
        console.error(e);
      }
    });
  }
}
