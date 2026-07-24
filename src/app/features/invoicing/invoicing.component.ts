import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InvoicingService, GenerateResult } from './invoicing.service';
import { ToastService } from '../../core/ui/toast.service';
import { SettingsService, DocumentSetting } from '../settings/settings.service';

@Component({
  selector: 'app-invoicing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './invoicing.component.html'
})
export class InvoicingComponent implements OnInit {

  ngOnInit() {
    this.settingsApi.document().subscribe({ next: c => this.cfg.set(c) });
  }
  private api = inject(InvoicingService);
  private toast = inject(ToastService);

  readonly busy = signal(false);
  readonly result = signal<GenerateResult | null>(null);
  readonly error = signal<string | null>(null);

  /** Bulan semasa 'YYYY-MM' */
  readonly currentPeriod = new Date().toISOString().slice(0, 7);

  private settingsApi = inject(SettingsService);
  readonly cfg = signal<DocumentSetting | null>(null);

  /** Label mod — jangan hardcode; tetapan SP yang menentukan. */
  modeLabel(): string {
    switch (this.cfg()?.invoiceGenMode) {
      case 'POSTPAID': return 'Postpaid — bulan lepas';
      case 'PREPAID':  return 'Prepaid — bulan hadapan';
      case 'CURRENT':  return 'Current — bulan semasa';
      default:         return '—';
    }
  }

  freqLabel(): string {
    const f = this.cfg()?.invoiceGenFreq;
    const map: Record<string, string> = {
      MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
      HALF_YEAR: 'Half Year', YEAR: 'Yearly'
    };
    return f ? (map[f] ?? f) : '—';
  }

  genDay(): number { return this.cfg()?.invoiceGenDay ?? 1; }

  /** Bil seterusnya — guna hari sebenar daripada tetapan, bukan andaian 1hb. */
  nextRun(): string {
    const day = this.genDay();
    const d = new Date();
    d.setMonth(d.getMonth() + 1, day);
    return d.toLocaleDateString('en-GB');
  }

  /**
   * posted == 0 ada beberapa sebab yang sangat berbeza. Sebelum ini UI
   * sentiasa melaporkan "sudah dijana sebelum ini" — tidak benar bagi akaun
   * baharu yang langganannya bermula selepas tempoh bil.
   */
  /** Tempoh yang benar-benar dibilkan. POSTPAID pada Julai membilkan Jun. */
  billedLabel(r: GenerateResult): string {
    return r.billedPeriods?.length ? r.billedPeriods.join(', ') : r.period;
  }

  noBillReason(r: GenerateResult): string {
    if (r.accountsScanned === 0) {
      return 'Tiada akaun aktif untuk SP ini.';
    }
    if (r.skippedAlreadyGenerated > 0) {
      return `${r.skippedAlreadyGenerated} akaun sudah dijana untuk tempoh ini — sistem tidak menjana pendua.`;
    }
    if (r.skippedNothingToCharge > 0) {
      return `${r.skippedNothingToCharge} akaun tiada apa untuk dibil bagi tempoh ini `
           + `(mod ${r.mode}) — biasanya kerana tarikh mula caj selepas tempoh tersebut.`;
    }
    if (r.skippedNoSubscription > 0) {
      return `${r.skippedNoSubscription} akaun tiada langganan produk.`;
    }
    return 'Tiada invois dijana.';
  }

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
          this.toast.success(`${r.invoicesPosted} invois dijana`, `Tempoh ${this.billedLabel(r)}`);
        } else {
          this.toast.info('Tiada bil baharu', this.noBillReason(r));
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
