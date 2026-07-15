import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InvoicingService, GenerateResult } from './invoicing.service';

@Component({
  selector: 'app-invoicing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './invoicing.component.html'
})
export class InvoicingComponent {
  private api = inject(InvoicingService);

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
    this.api.generate({ period: this.currentPeriod, mode: 'CURRENT' }).subscribe({
      next: r => { this.result.set(r); this.busy.set(false); },
      error: e => {
        this.error.set('Gagal menjana bil. ' + (e?.error?.message ?? 'Semak backend.'));
        this.busy.set(false);
        console.error(e);
      }
    });
  }
}
