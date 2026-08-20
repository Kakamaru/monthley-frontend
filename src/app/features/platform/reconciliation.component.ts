import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface SpSummary {
  spCode: string; spName: string; absorb: boolean;
  bilangan: number; gross: number; fee: number; net: number;
}

interface TxnRow {
  id: number; spCode: string; spName: string; ourRef: string;
  gatewayRef: string | null; gateway: string;
  amount: number; fee: number | null; paidAmount: number | null;
  status: string; paymentId: number | null; receiptNo: string | null;
  paidAt: string | null; masalah: string | null;
}

interface ReconResult {
  ringkasan: SpSummary[]; transaksi: TxnRow[]; bilMasalah: number;
}

/**
 * Reconciliation gerbang — superadmin sahaja.
 *
 * Wang tiba di akaun Rapidevelop sebagai satu jumlah; ringkasan per SP
 * menjawab 'siapa berapa'. Lajur BERSIH ialah yang sepadan dengan penyata
 * bank apabila SP menyerap yuran.
 */
@Component({
  selector: 'app-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reconciliation.component.html',
  styleUrl: './reconciliation.component.scss'
})
export class ReconciliationComponent {
  private http = inject(HttpClient);

  dari = this.tarikh(-7);
  hingga = this.tarikh(0);
  spCode = '';

  readonly data = signal<ReconResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Tunjuk baris bermasalah sahaja — untuk siasatan. */
  readonly hanyaMasalah = signal(false);

  /**
   * Senarai SP untuk penapis.
   *
   * Diambil daripada endpoint tetapan gerbang — ia sudah memulangkan
   * spCode dan spName untuk setiap SP, jadi endpoint baharu hanya untuk
   * senarai dropdown akan menduplikasi kerja yang sama.
   */
  readonly spList = signal<{ spCode: string; spName: string }[]>([]);

  constructor() {
    this.muatSp();
    this.muat();
  }

  private muatSp() {
    this.http.get<{ spCode: string; spName: string }[]>('/api/v1/platform/gateway')
      .subscribe({
        next: r => this.spList.set(
          r.map(x => ({ spCode: x.spCode, spName: x.spName }))
           .sort((a, b) => a.spCode.localeCompare(b.spCode))),
        // Penapis kekal boleh ditaip jika senarai gagal — laporan masih
        // berguna tanpa dropdown.
        error: () => this.spList.set([])
      });
  }

  private tarikh(offsetHari: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetHari);
    return d.toISOString().slice(0, 10);
  }

  muat() {
    this.loading.set(true);
    this.error.set(null);

    const q = new URLSearchParams({ dari: this.dari, hingga: this.hingga });
    if (this.spCode.trim()) q.set('spCode', this.spCode.trim());

    this.http.get<ReconResult>(`/api/v1/platform/reconciliation?${q}`).subscribe({
      next: r => { this.data.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan laporan.');
        this.loading.set(false);
      }
    });
  }

  readonly barisan = computed(() => {
    const t = this.data()?.transaksi ?? [];
    return this.hanyaMasalah() ? t.filter(x => x.masalah) : t;
  });

  readonly jumlahGross = computed(() =>
    (this.data()?.ringkasan ?? []).reduce((a, s) => a + s.gross, 0));
  readonly jumlahFee = computed(() =>
    (this.data()?.ringkasan ?? []).reduce((a, s) => a + s.fee, 0));
  readonly jumlahNet = computed(() =>
    (this.data()?.ringkasan ?? []).reduce((a, s) => a + s.net, 0));

  warnaStatus(s: string): { bg: string; c: string } {
    switch (s) {
      case 'SUCCESS': return { bg: '#e7f6ec', c: '#128a41' };
      case 'FAILED':  return { bg: '#fdecec', c: '#d64545' };
      case 'EXPIRED': return { bg: '#f1f5f2', c: '#6b7f86' };
      default:        return { bg: '#fdf4e3', c: '#a3691f' };   // NEW, PENDING
    }
  }

  /**
   * Eksport CSV untuk padanan penyata bank.
   *
   * Dijana di pelayar kerana data sudah ada di sini — bulatan tambahan ke
   * pelayan tidak menambah apa-apa, dan laporan ini tidak pernah cukup
   * besar untuk menjadi masalah.
   */
  eksport() {
    const t = this.barisan();
    if (!t.length) return;

    const tajuk = ['ID', 'SP', 'Nama SP', 'Rujukan Kami', 'Rujukan Gerbang',
                   'Gerbang', 'Amaun', 'Caj', 'Diterima', 'Status',
                   'No. Resit', 'Masa Bayar', 'Masalah'];

    const baris = t.map(x => [
      x.id, x.spCode, x.spName, x.ourRef, x.gatewayRef ?? '',
      x.gateway, x.amount, x.fee ?? '', x.paidAmount ?? '',
      x.status, x.receiptNo ?? '', x.paidAt ?? '', x.masalah ?? ''
    ]);

    // Petikan berganda dilarikan; nama SP boleh mengandungi koma.
    const csv = [tajuk, ...baris]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reconciliation-${this.dari}-${this.hingga}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
