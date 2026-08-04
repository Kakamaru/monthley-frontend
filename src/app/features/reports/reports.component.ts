import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { binaCsv, muatTurunCsv } from '../../core/csv';
import { tarikhIso } from '../../core/tarikh';
import { ReportsService, TrialBalance, ProfitLoss, Collection } from './reports.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../../core/models/product.model';

/**
 * Laporan kewangan.
 *
 * Dua tab berfungsi; selebihnya dipaparkan dilumpuhkan supaya SP
 * melihat apa yang akan datang, dan supaya rangka wujud untuk
 * menambahnya satu demi satu.
 *
 * Balance Sheet SENGAJA tiada dalam senarai: ia memerlukan baki
 * pembukaan yang sistem belum ada, dan kunci kira-kira tanpa baki
 * pembukaan bukan kosong — ia salah.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html'
})
export class ReportsComponent {

  private api = inject(ReportsService);
  private catalog = inject(ProductsService);

  readonly tab = signal<'trial' | 'pnl' | 'collection'>('trial');
  readonly busy = signal(false);

  readonly trial = signal<TrialBalance | null>(null);
  readonly pnl = signal<ProfitLoss | null>(null);

  tAsAt = tarikhIso();
  pFrom = tarikhIso().slice(0, 4) + '-01-01';
  pTo = tarikhIso();

  readonly belumDibina = [
    'Account List', 'List Of Arrears', 'Print Invoice',
    'Monthly Statistic', 'Expenses', 'Ageing', 'Customer Account Statement',
    'Daily Collection & Bank Recon', 'Tax Summary (SST)'
  ];

  // ── Senarai Kutipan ──────────────────────────────────────────────

  readonly collection = signal<Collection | null>(null);
  readonly produk = signal<Product[]>([]);

  cFrom = tarikhIso().slice(0, 8) + '01';
  cTo = tarikhIso();
  cStatus: string | null = null;
  cPaymentType: string | null = null;
  cByProduct = false;
  cMonthly = false;
  cProductId: number | null = null;

  readonly kaedahBayaran = ['CASH', 'FPX', 'CHEQUE', 'TRANSFER', 'ADJUSTMENT'];

  /** Kosongkan kriteria kutipan kepada lalai. */
  clearCollection() {
    this.cFrom = tarikhIso().slice(0, 8) + '01';
    this.cTo = tarikhIso();
    this.cStatus = null;
    this.cPaymentType = null;
    this.cByProduct = false;
    this.cMonthly = false;
    this.cProductId = null;
    this.collection.set(null);
  }

  pilihTab(t: 'trial' | 'pnl' | 'collection') {
    this.tab.set(t);
    this.trial.set(null);
    this.pnl.set(null);

    // Kriteria dikosongkan bersama hasil. Kembali ke tab dan mendapati
    // julat tarikh lama masih terisi bermakna kerani menekan View Report
    // dan mendapat laporan bulan lepas tanpa menyedarinya.
    this.clearCollection();

    if (t === 'collection' && this.produk().length === 0) {
      this.catalog.list({ active: true, page: 0, size: 500 }).subscribe({
        next: r => this.produk.set(r.items), error: () => {}
      });
    }
  }

  readonly pdfBusy = signal(false);

  cetakPdf() {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.api.collectionPdf({
      from: this.cFrom, to: this.cTo,
      byProduct: this.cByProduct, monthlyBasis: this.cMonthly,
      status: this.cStatus, paymentType: this.cPaymentType,
      productId: this.cByProduct ? this.cProductId : null
    }).subscribe({
      next: res => {
        this.pdfBusy.set(false);
        const blob = res.body;
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.pdfBusy.set(false)
    });
  }

  eksportCollection() {
    const c = this.collection();
    if (!c) return;
    const kepala = c.byProduct
      ? ['Tarikh', 'Produk', 'No. Resit', 'Akaun', 'Terima Daripada', 'Status', 'Jenis Bayaran', 'Amaun']
      : ['Tarikh', 'No. Resit', 'Akaun', 'Terima Daripada', 'Keterangan', 'Status', 'Jenis Bayaran', 'Amaun'];
    const baris = c.rows.map(r => c.byProduct
      ? [r.date ?? '', r.productName ?? '', r.receiptNo, r.accountNo,
         r.issuedTo, r.status, r.paymentType ?? '', r.amount.toFixed(2)]
      : [r.date ?? '', r.receiptNo, r.accountNo, r.issuedTo,
         r.description, r.status, r.paymentType ?? '', r.amount.toFixed(2)]);
    muatTurunCsv(`kutipan-${c.from}-${c.to}.csv`, binaCsv(kepala, baris));
  }

  jana() {
    if (this.busy()) return;
    this.busy.set(true);

    if (this.tab() === 'trial') {
      this.api.trialBalance(this.tAsAt || null).subscribe({
        next: r => { this.trial.set(r); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    } else if (this.tab() === 'pnl') {
      this.api.profitLoss(this.pFrom || null, this.pTo || null).subscribe({
        next: r => { this.pnl.set(r); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    } else {
      this.api.collection({
        from: this.cFrom, to: this.cTo,
        byProduct: this.cByProduct, monthlyBasis: this.cMonthly,
        status: this.cStatus, paymentType: this.cPaymentType,
        productId: this.cByProduct ? this.cProductId : null
      }).subscribe({
        next: r => { this.collection.set(r); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    }
  }

  eksportTrial() {
    const t = this.trial();
    if (!t) return;
    const csv = binaCsv(['Kod', 'Akaun', 'Jenis', 'Debit', 'Kredit'],
      [...t.rows.map(r => [r.code, r.name, r.accountType,
                           r.debit.toFixed(2), r.credit.toFixed(2)]),
       ['', 'JUMLAH', '', t.totalDebit.toFixed(2), t.totalCredit.toFixed(2)]]);
    muatTurunCsv(`imbangan-duga-${t.asAt}.csv`, csv);
  }

  eksportPnl() {
    const p = this.pnl();
    if (!p) return;
    const baris: string[][] = [];
    baris.push(['HASIL', '', '']);
    p.income.forEach(r => baris.push([r.code, r.name, r.amount.toFixed(2)]));
    baris.push(['', 'Jumlah Hasil', p.totalIncome.toFixed(2)]);
    baris.push(['PERBELANJAAN', '', '']);
    p.expense.forEach(r => baris.push([r.code, r.name, r.amount.toFixed(2)]));
    baris.push(['', 'Jumlah Perbelanjaan', p.totalExpense.toFixed(2)]);
    baris.push(['', 'UNTUNG / (RUGI) BERSIH', p.net.toFixed(2)]);
    muatTurunCsv(`untung-rugi-${p.from}-${p.to}.csv`,
                 binaCsv(['Kod', 'Akaun', 'Amaun'], baris));
  }
}
