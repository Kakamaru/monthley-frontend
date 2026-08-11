import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ExpensesService, ExpenseReport, DetailReport, AgingReport, PaymentReport
} from './expenses.service';
import { SpContextService } from '../../core/services/sp-context.service';

type Jenis = 'expense' | 'expdetail' | 'aging' | 'payments';

@Component({
  selector: 'app-exp-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './expenses.scss'
})
export class ExpReportsComponent {
  private api = inject(ExpensesService);
  readonly sp = inject(SpContextService);

  readonly jenis = signal<Jenis>('expense');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  from = '';
  to = '';

  readonly expense = signal<ExpenseReport | null>(null);
  readonly detail = signal<DetailReport | null>(null);
  readonly aging = signal<AgingReport | null>(null);
  readonly payments = signal<PaymentReport | null>(null);

  readonly tabs: { k: Jenis; l: string }[] = [
    { k: 'expense',   l: 'Penyata Perbelanjaan' },
    { k: 'expdetail', l: 'Perbelanjaan Terperinci' },
    { k: 'aging',     l: 'Tunggakan Pembekal' },
    { k: 'payments',  l: 'Penyata Bayaran' }
  ];

  readonly tajuk: Record<Jenis, string> = {
    expense:   'PENYATA PERBELANJAAN',
    expdetail: 'LAPORAN PERBELANJAAN (TERPERINCI)',
    aging:     'PENYATA TUNGGAKAN PEMBEKAL',
    payments:  'PENYATA BAYARAN'
  };

  constructor() { this.generate(); }

  setJenis(k: Jenis) { this.jenis.set(k); this.generate(); }

  reset() { this.from = ''; this.to = ''; this.generate(); }

  /** Tempoh dalam bahasa manusia, untuk kepala penyata. */
  tempoh(): string {
    if (this.jenis() === 'aging') {
      return 'Sehingga ' + (this.to || this.hariIni());
    }
    if (!this.from && !this.to) return 'Sehingga kini';
    return (this.from || 'Awal') + ' — ' + (this.to || 'Kini');
  }

  hariIni(): string { return new Date().toISOString().slice(0, 10); }

  peratus(bahagian: number, jumlah: number): number {
    return jumlah ? Math.round(bahagian / jumlah * 100) : 0;
  }

  generate() {
    this.loading.set(true);
    this.error.set(null);
    const f = this.from || null;
    const t = this.to || null;

    const gagal = (e: any) => {
      this.error.set(e?.error?.message ?? 'Gagal menjana laporan.');
      this.loading.set(false);
    };

    switch (this.jenis()) {
      case 'expense':
        this.api.reportExpense(f, t).subscribe({
          next: r => { this.expense.set(r); this.loading.set(false); }, error: gagal
        });
        break;
      case 'expdetail':
        this.api.reportExpenseDetail(f, t).subscribe({
          next: r => { this.detail.set(r); this.loading.set(false); }, error: gagal
        });
        break;
      case 'aging':
        // Penuaan ialah gambaran pada SATU tarikh, bukan tempoh: baki
        // tertunggak pada 31 Julai tidak bermakna 'antara 1 dan 31 Julai'.
        this.api.reportAging(t).subscribe({
          next: r => { this.aging.set(r); this.loading.set(false); }, error: gagal
        });
        break;
      case 'payments':
        this.api.reportPayments(f, t).subscribe({
          next: r => { this.payments.set(r); this.loading.set(false); }, error: gagal
        });
        break;
    }
  }

  /**
   * Cetak kawasan penyata sahaja.
   *
   * Kandungan disalin ke tetingkap baharu dan bukan menggunakan @media
   * print pada halaman semasa: portal mempunyai sidebar, bar atas, dan
   * tema gelap yang semuanya perlu disembunyikan satu demi satu. Tetingkap
   * bersih dengan gaya cetakan sendiri lebih pendek dan lebih boleh
   * diramal.
   */
  print() {
    const node = document.getElementById('stmtArea');
    if (!node) return;

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { this.error.set('Benarkan pop-up untuk mencetak.'); return; }

    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${this.tajuk[this.jenis()]}</title><style>
body{font-family:Arial,Helvetica,sans-serif;padding:34px;color:#1a2230;font-size:13px}
.stmt-top{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:20px}
.stmt-org{font-size:17px;font-weight:700}
.stmt-sub{font-size:12px;color:#667;margin-top:2px}
.stmt-r{text-align:right}
.stmt-title{font-size:15px;font-weight:700;letter-spacing:.04em}
.stmt-p{font-size:12px;color:#667;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-top:6px}
th,td{padding:7px 9px;border-bottom:1px solid #ddd;text-align:left}
th{background:#f4f5f7;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
.num{text-align:right}
tr.grp td{font-weight:700;background:#fafbfc}
td.sub{padding-left:26px;color:#555}
tfoot td{font-weight:700;border-top:2px solid #333;border-bottom:none}
.empty{padding:26px;text-align:center;color:#777}
</style></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }
}
