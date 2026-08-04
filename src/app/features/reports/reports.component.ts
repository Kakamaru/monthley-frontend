import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { binaCsv, muatTurunCsv } from '../../core/csv';
import { tarikhIso } from '../../core/tarikh';
import { ReportsService, TrialBalance, ProfitLoss, Collection, AccountList, SubList, ArrearList, AgeList, StatsResponse } from './reports.service';
import { ProductsService } from '../products/products.service';
import { SettingsService } from '../settings/settings.service';
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
  private settings = inject(SettingsService);
  private sanitizer = inject(DomSanitizer);

  readonly tab = signal<'trial' | 'pnl' | 'collection' | 'accounts' | 'subs' | 'arrears' | 'ageing' | 'stats'>('trial');
  readonly busy = signal(false);

  readonly trial = signal<TrialBalance | null>(null);
  readonly pnl = signal<ProfitLoss | null>(null);

  tAsAt = tarikhIso();
  pFrom = tarikhIso().slice(0, 4) + '-01-01';
  pTo = tarikhIso();

  readonly belumDibina = [
    'Print Invoice',
    'Expenses', 'Customer Account Statement',
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

  // ── Senarai Akaun ────────────────────────────────────────────────

  readonly accounts = signal<AccountList | null>(null);
  readonly akaunCategories = signal<{ id: number; name: string }[]>([]);

  aActive: boolean | null = true;
  aCategoryId: number | null = null;
  aSearch = '';

  clearAccounts() {
    this.aActive = true;
    this.aCategoryId = null;
    this.aSearch = '';
    this.accounts.set(null);
  }

  cetakAccountsPdf() {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.api.accountListPdf({
      active: this.aActive, categoryId: this.aCategoryId, search: this.aSearch || null
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

  /** Excel mendapat SEMUA medan — di situ tempatnya data mentah. */
  eksportAccounts() {
    const a = this.accounts();
    if (!a) return;
    const csv = binaCsv(
      ['No. Akaun', 'Nama Akaun', 'No. KP', 'Terima Bil', 'Telefon', 'E-mel',
       'Alamat', 'Poskod', 'Negeri', 'Kategori', 'Status', 'Baki'],
      a.rows.map(r => [r.accountNo, r.accountName, r.idNo, r.issueTo, r.phone, r.email,
                       r.address, r.postcode, r.state, r.categoryName,
                       r.status === 'ACTIVE' ? 'Aktif' : 'Tidak Aktif',
                       r.balance.toFixed(2)]));
    muatTurunCsv(`senarai-akaun-${tarikhIso()}.csv`, csv);
  }

  // ── Senarai Langganan ────────────────────────────────────────────

  readonly subs = signal<SubList | null>(null);
  readonly prodCategories = signal<{ id: number; name: string }[]>([]);

  sCategoryId: number | null = null;
  sProductId: number | null = null;
  sStatus: boolean | null = true;

  clearSubs() {
    this.sCategoryId = null;
    this.sProductId = null;
    this.sStatus = true;
    this.subs.set(null);
  }

  cetakSubsPdf() {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.api.subscriptionsPdf({
      productCategoryId: this.sCategoryId, productId: this.sProductId,
      status: this.sStatus
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

  eksportSubs() {
    const s = this.subs();
    if (!s) return;
    const csv = binaCsv(
      ['No. Akaun', 'Nama Akaun', 'Kod Produk', 'Produk', 'Kategori Produk',
       'Kuantiti', 'Mula', 'Tamat', 'Status'],
      s.rows.map(r => [r.accountNo, r.accountName, r.productCode, r.productName,
                       r.productCategory, String(r.quantity),
                       r.startDate ?? '', r.endDate ?? '',
                       r.active ? 'Aktif' : 'Tamat']));
    muatTurunCsv(`senarai-langganan-${tarikhIso()}.csv`, csv);
  }

  // ── Senarai Tunggakan ────────────────────────────────────────────

  readonly arrears = signal<ArrearList | null>(null);

  arAsAt = tarikhIso();
  arOnly = true;

  clearArrears() {
    this.arAsAt = tarikhIso();
    this.arOnly = true;
    this.arrears.set(null);
  }

  cetakArrearsPdf() {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.api.arrearsPdf(this.arAsAt, this.arOnly).subscribe({
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

  eksportArrears() {
    const a = this.arrears();
    if (!a) return;
    const csv = binaCsv(['No. Akaun', 'Nama', 'E-mel', 'Tempoh', 'Amaun'],
      a.rows.map(r => [r.accountNo, r.accountName, r.email, r.period,
                       r.amount.toFixed(2)]));
    muatTurunCsv(`tunggakan-${a.asAt}.csv`, csv);
  }

  // ── Ageing ───────────────────────────────────────────────────────

  readonly ageing = signal<AgeList | null>(null);

  /**
   * Susunan dipilih pengguna.
   *
   * Kerani yang menyemak baris demi baris terhadap rekodnya mahu susunan
   * akaun; yang menilai risiko mahu jumlah terbesar dahulu. Satu susunan
   * tetap memaksa separuh daripada mereka mengimbas.
   *
   * Disusun dalam MEMORI: Ageing memulangkan semua baris sekali gus,
   * tiada paginasi. Menghantarnya ke DB bermakna perjalanan tambahan
   * untuk data yang sudah ada.
   */
  readonly agSort = signal<'akaun' | 'nama' | 'jumlah'>('akaun');
  readonly agAsc = signal(true);

  agSusun(k: 'akaun' | 'nama' | 'jumlah') {
    if (this.agSort() === k) {
      this.agAsc.set(!this.agAsc());
    } else {
      this.agSort.set(k);
      // Nombor bermula MENURUN: sesiapa yang menyusun ikut jumlah mahu
      // yang terbesar, bukan yang paling kecil.
      this.agAsc.set(k !== 'jumlah');
    }
  }

  readonly agRows = computed(() => {
    const a = this.ageing();
    if (!a) return [];
    const k = this.agSort();
    const arah = this.agAsc() ? 1 : -1;
    return [...a.rows].sort((x, y) => {
      if (k === 'jumlah') return (x.total - y.total) * arah;
      const v = k === 'akaun'
        ? x.accountNo.localeCompare(y.accountNo)
        : x.accountName.localeCompare(y.accountName);
      return v * arah;
    });
  });

  agAsAt = tarikhIso();
  agCategoryId: number | null = null;

  clearAgeing() {
    this.agAsAt = tarikhIso();
    this.agCategoryId = null;
    this.ageing.set(null);
  }

  cetakAgeingPdf() {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.api.ageingPdf(this.agAsAt, this.agCategoryId,
                       this.agSort(), this.agAsc()).subscribe({
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

  eksportAgeing() {
    const a = this.ageing();
    if (!a) return;
    const csv = binaCsv(
      ['No. Akaun', 'Nama', 'Jumlah', 'Belum Matang', '0-30', '31-60',
       '61-90', '91-180', '180+'],
      this.agRows().map(r => [r.accountNo, r.accountName, r.total.toFixed(2),
                       r.notDue.toFixed(2), r.d30.toFixed(2), r.d60.toFixed(2),
                       r.d90.toFixed(2), r.d180.toFixed(2), r.over180.toFixed(2)]));
    muatTurunCsv(`ageing-${a.asAt}.csv`, csv);
  }

  // ── Statistik Bulanan ────────────────────────────────────────────

  readonly stats = signal<StatsResponse | null>(null);

  stYear = new Date().getFullYear();
  stMonth = new Date().getMonth() + 1;

  readonly tahunPilihan = Array.from({ length: 6 },
    (_, i) => new Date().getFullYear() - i);

  readonly namaBulan = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  /**
   * SVG datang daripada backend, bukan input pengguna.
   *
   * Angular membuang <svg> daripada innerHTML biasa. ChartSvg sudah
   * meng-escape nama produk, jadi menandakannya dipercayai selamat di
   * sini — dan ia bermakna skrin dan PDF berkongsi lukisan yang SAMA.
   */
  svg(kod: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(kod ?? '');
  }

  clearStats() {
    this.stYear = new Date().getFullYear();
    this.stMonth = new Date().getMonth() + 1;
    this.stats.set(null);
  }

  cetakStatsPdf() {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(true);
    this.api.monthlyStatsPdf(this.stYear, this.stMonth).subscribe({
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

  pilihTab(t: 'trial' | 'pnl' | 'collection' | 'accounts' | 'subs' | 'arrears' | 'ageing' | 'stats') {
    this.tab.set(t);
    this.trial.set(null);
    this.pnl.set(null);

    // Kriteria dikosongkan bersama hasil. Kembali ke tab dan mendapati
    // julat tarikh lama masih terisi bermakna kerani menekan View Report
    // dan mendapat laporan bulan lepas tanpa menyedarinya.
    this.clearCollection();
    this.clearAccounts();
    this.clearSubs();
    this.clearArrears();
    this.clearAgeing();
    this.clearStats();

    if (t === 'ageing' && this.akaunCategories().length === 0) {
      this.settings.accountCategories().subscribe({
        next: c => this.akaunCategories.set(c), error: () => {}
      });
    }

    if (t === 'subs') {
      if (this.produk().length === 0) {
        this.catalog.list({ active: true, page: 0, size: 500 }).subscribe({
          next: r => this.produk.set(r.items), error: () => {}
        });
      }
      if (this.prodCategories().length === 0) {
        this.catalog.categories().subscribe({
          next: c => this.prodCategories.set(c), error: () => {}
        });
      }
    }

    if (t === 'accounts' && this.akaunCategories().length === 0) {
      this.settings.accountCategories().subscribe({
        next: c => this.akaunCategories.set(c), error: () => {}
      });
    }

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
    } else if (this.tab() === 'stats') {
      this.api.monthlyStats(this.stYear, this.stMonth).subscribe({
        next: r => { this.stats.set(r); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    } else if (this.tab() === 'ageing') {
      this.api.ageing(this.agAsAt, this.agCategoryId).subscribe({
        next: r => { this.ageing.set(r); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    } else if (this.tab() === 'arrears') {
      this.api.arrears(this.arAsAt, this.arOnly).subscribe({
        next: r => { this.arrears.set(r); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    } else if (this.tab() === 'subs') {
      this.api.subscriptions({
        productCategoryId: this.sCategoryId, productId: this.sProductId,
        status: this.sStatus
      }).subscribe({
        next: r => { this.subs.set(r); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    } else if (this.tab() === 'accounts') {
      this.api.accountList({
        active: this.aActive, categoryId: this.aCategoryId,
        search: this.aSearch || null
      }).subscribe({
        next: r => { this.accounts.set(r); this.busy.set(false); },
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
