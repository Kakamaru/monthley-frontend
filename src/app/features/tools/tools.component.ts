import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { bulanIso } from '../../core/tarikh';
import { periodRange } from '../../core/ui/period-range';
import { ToastService } from '../../core/ui/toast.service';
import { SpContextService } from '../../core/services/sp-context.service';
import { InvoicingService, GenerateResult } from '../invoicing/invoicing.service';
import { SettingsService, DocumentSetting } from '../settings/settings.service';
import { AdhocService, PeriodOption } from '../adhoc/adhoc.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../../core/models/product.model';
import { ToolsService, UsageBaris } from './tools.service';

/**
 * Alat — penjanaan bil dan caj berasaskan penggunaan.
 *
 * Menggantikan skrin Jana Bil: kedua-dua kadnya berpindah ke sini
 * tanpa perubahan, dan Caj Penggunaan ditambah di bawahnya. Legacy
 * menyusunnya dengan cara yang sama.
 */
@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tools.component.html'
})
export class ToolsComponent implements OnInit {

  private api = inject(InvoicingService);
  private tools = inject(ToolsService);
  private adhoc = inject(AdhocService);
  private catalog = inject(ProductsService);
  private settingsApi = inject(SettingsService);
  private toast = inject(ToastService);
  readonly sp = inject(SpContextService);

  ngOnInit() {
    this.settingsApi.document().subscribe({ next: c => this.cfg.set(c) });

    this.adhoc.periods().subscribe({
      next: p => this.periods.set(p), error: () => {}
    });

    // PER_USE sahaja. Caj penggunaan ialah kuantiti yang berubah setiap
    // tempoh; produk bulanan mempunyai kadar tetap dan dibil melalui
    // langganan.
    this.catalog.list({ active: true, page: 0, size: 500 }).subscribe({
      next: r => this.produk.set(r.items.filter(p => p.chargeFrequency === 'PER_USE')),
      error: () => {}
    });
  }

  // ── Jana bil (dipindahkan daripada skrin Jana Bil) ────────────────

  readonly busy = signal(false);
  readonly result = signal<GenerateResult | null>(null);
  readonly error = signal<string | null>(null);
  readonly currentPeriod = bulanIso();
  readonly cfg = signal<DocumentSetting | null>(null);

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
   * Tempoh yang benar-benar dibilkan. POSTPAID pada Julai membilkan Jun.
   *
   * periodRange, bukan join(', '): akaun YEAR dengan produk MONTHLY
   * menghasilkan dua belas tempoh dan toast mengambil separuh skrin.
   */
  billedLabel(r: GenerateResult): string {
    return periodRange(r.billedPeriods, r.period);
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
      }
    });
  }

  // ── Caj penggunaan ────────────────────────────────────────────────

  readonly periods = signal<PeriodOption[]>([]);
  readonly produk = signal<Product[]>([]);

  readonly ubOpen = signal(false);
  readonly ubBaris = signal<UsageBaris[]>([]);
  readonly ubBusy = signal(false);
  readonly ubMuatTurunBusy = signal(false);
  readonly ubNamaFail = signal<string | null>(null);

  ubPeriodId: number | null = null;
  ubProductId: number | null = null;
  private ubFail: File | null = null;

  /** Baris yang boleh disimpan — baris bermasalah kekal dipapar. */
  readonly ubSah = computed(() => this.ubBaris().filter(b => !b.masalah));
  readonly ubJumlah = computed(
    () => this.ubSah().reduce((t, b) => t + (b.amount ?? 0), 0));

  muatTurunTemplat() {
    if (this.ubMuatTurunBusy()) return;
    this.ubMuatTurunBusy.set(true);
    this.tools.templat().subscribe({
      next: res => {
        this.ubMuatTurunBusy.set(false);
        const blob = res.body;
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `caj-penggunaan-${bulanIso()}.xlsx`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: e => {
        this.ubMuatTurunBusy.set(false);
        this.toast.error(`Gagal muat turun templat (${e?.status ?? '?'})`,
          e?.error?.message ?? 'Cuba lagi.');
      }
    });
  }

  bukaUpload() {
    this.ubOpen.set(true);
    this.ubBaris.set([]);
    this.ubNamaFail.set(null);
    this.ubFail = null;
    this.ubPeriodId = null;
    this.ubProductId = null;
  }

  tutupUpload() { this.ubOpen.set(false); }

  pilihFail(e: Event) {
    const input = e.target as HTMLInputElement;
    this.ubFail = input.files?.[0] ?? null;
    this.ubNamaFail.set(this.ubFail?.name ?? null);
    this.ubBaris.set([]);
  }

  /**
   * Pratonton SEBELUM simpan.
   *
   * Kerani menyemak apa yang sistem baca daripada fail — nombor akaun
   * yang tidak padan muncul di sini dengan sebabnya, bukan hilang
   * secara senyap selepas menyimpan.
   */
  pratonton() {
    if (!this.ubFail || !this.ubProductId || this.ubBusy()) return;
    this.ubBusy.set(true);
    this.tools.pratonton(this.ubFail, this.ubProductId).subscribe({
      next: b => {
        this.ubBaris.set(b);
        this.ubBusy.set(false);
        const gagal = b.filter(x => x.masalah).length;
        if (gagal > 0) {
          this.toast.info(`${gagal} baris tidak boleh disimpan`,
            'Baris bermasalah ditandakan dalam senarai.');
        }
      },
      error: e => {
        this.ubBusy.set(false);
        this.toast.error(`Gagal baca fail (${e?.status ?? '?'})`,
          e?.error?.message ?? 'Pastikan fail daripada templat.');
      }
    });
  }

  simpanUsage() {
    if (!this.ubProductId || !this.ubPeriodId || this.ubBusy()) return;
    const sah = this.ubSah();
    if (sah.length === 0) return;

    this.ubBusy.set(true);
    this.tools.simpan(this.ubProductId, this.ubPeriodId, sah).subscribe({
      next: r => {
        this.ubBusy.set(false);
        if (r.dilangkau > 0) {
          // Dilangkau bukan ralat — pendua ditolak supaya pelanggan
          // tidak dicaj dua kali. Kerani perlu tahu berapa dan mengapa.
          this.toast.info(`${r.disimpan} disimpan, ${r.dilangkau} dilangkau`,
            r.sebab.slice(0, 3).join(' '));
        } else {
          this.toast.success(`${r.disimpan} caj disimpan`,
            'Akan dibil pada penjanaan seterusnya.');
        }
        this.tutupUpload();
      },
      error: e => {
        this.ubBusy.set(false);
        this.toast.error(`Gagal simpan (${e?.status ?? '?'})`,
          e?.error?.message ?? 'Cuba lagi.');
      }
    });
  }
}
