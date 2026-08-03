import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { binaCsv, muatTurunCsv } from '../../core/csv';
import { tarikhIso } from '../../core/tarikh';
import { AdhocService, PeriodOption } from '../adhoc/adhoc.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../../core/models/product.model';
import { SpLedgerService, SpLedgerRow } from './sp-ledger.service';

/**
 * Lejar SP — setiap transaksi merentas semua akaun.
 *
 * Tandanya DICERMINKAN daripada penyata pelanggan: invois menurunkan
 * baki SP kerana caj telah dikeluarkan tetapi belum dikutip.
 */
@Component({
  selector: 'app-sp-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sp-ledger.component.html'
})
export class SpLedgerComponent implements OnInit {

  private api = inject(SpLedgerService);
  private adhoc = inject(AdhocService);
  private catalog = inject(ProductsService);

  readonly rows = signal<SpLedgerRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly size = 50;

  readonly periods = signal<PeriodOption[]>([]);
  readonly produk = signal<Product[]>([]);

  fDocNo = '';
  fProductId: number | null = null;
  fDocType: string | null = null;
  fPeriodId: number | null = null;
  fFrom = '';
  fTo = '';

  readonly totalPages = computed(
    () => Math.max(1, Math.ceil(this.total() / this.size)));

  readonly label = computed(() => {
    const t = this.total();
    if (t === 0) return 'Tiada transaksi';
    const a = this.page() * this.size + 1;
    const b = Math.min(a + this.size - 1, t);
    return `Menunjukkan ${a}-${b} daripada ${t}`;
  });

  ngOnInit() {
    this.adhoc.periods().subscribe({ next: p => this.periods.set(p), error: () => {} });
    this.catalog.list({ active: true, page: 0, size: 500 }).subscribe({
      next: r => this.produk.set(r.items), error: () => {}
    });
    this.load();
  }

  private soalan(page: number, size: number) {
    return {
      docNo: this.fDocNo || null,
      productId: this.fProductId,
      docType: this.fDocType,
      periodId: this.fPeriodId,
      from: this.fFrom || null,
      to: this.fTo || null,
      page, size
    };
  }

  load() {
    this.loading.set(true);
    this.api.list(this.soalan(this.page(), this.size)).subscribe({
      next: r => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: () => { this.rows.set([]); this.loading.set(false); }
    });
  }

  cari() { this.page.set(0); this.load(); }

  clear() {
    this.fDocNo = ''; this.fProductId = null; this.fDocType = null;
    this.fPeriodId = null; this.fFrom = ''; this.fTo = '';
    this.cari();
  }

  pergi(n: number) {
    if (n < 0 || n >= this.totalPages()) return;
    this.page.set(n);
    this.load();
  }

  jenisLabel(t: string): string {
    const m: Record<string, string> = {
      INVOICE: 'Invois', RECEIPT: 'Resit',
      CREDIT_NOTE: 'Nota Kredit', DEBIT_NOTE: 'Nota Debit'
    };
    return m[t] ?? t;
  }

  /**
   * Eksport SEMUA baris hasil carian, bukan halaman semasa.
   *
   * SP memuat turun untuk bekerja di luar sistem, dan lima puluh baris
   * pertama daripada tiga puluh ribu tidak berguna.
   */
  eksport() {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.api.list(this.soalan(0, 100000)).subscribe({
      next: r => {
        const kepala = ['Tarikh Transaksi', 'Akaun', 'Dokumen', 'No. Dokumen',
                        'Item', 'Catatan', 'Tempoh', 'Amaun', 'Baki', 'Status'];
        const csv = binaCsv(kepala, r.items.map(x => [
          x.txnAt ?? '', x.accountNo, this.jenisLabel(x.docType), x.docNo,
          x.item ?? '', x.remarks ?? '', x.period ?? '',
          x.amount.toFixed(2), x.balance.toFixed(2),
          x.cancelled ? 'Batal' : 'Aktif'
        ]));
        muatTurunCsv(`lejar-sp-${tarikhIso()}.csv`, csv);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false)
    });
  }
}
