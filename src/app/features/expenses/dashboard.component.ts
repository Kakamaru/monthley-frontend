import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExpensesService, Dashboard } from './expenses.service';

@Component({
  selector: 'app-exp-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './expenses.scss'
})
export class ExpDashboardComponent {
  private api = inject(ExpensesService);
  private router = inject(Router);

  readonly data = signal<Dashboard | null>(null);

  /**
   * Trend tujuh bulan PENUH — bulan tanpa aktiviti diisi dengan sifar.
   *
   * Query hanya memulangkan bulan yang mempunyai data, jadi carta memapar
   * satu bar tunggal apabila hanya Ogos ada rekod. Jurang dalam siri masa
   * lebih mengelirukan daripada sifar yang jelas: pengguna tidak boleh
   * membezakan 'tiada perbelanjaan' daripada 'tiada data'.
   *
   * Diisi di sini dan bukan dalam SQL — MySQL memerlukan jadual kalendar
   * atau CTE rekursif untuk perkara yang lapan baris TypeScript
   * selesaikan.
   */
  readonly trendPenuh = computed(() => {
    const ada = new Map((this.data()?.trend ?? []).map(p => [p.label, p]));
    const keluar = [];
    const kini = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(kini.getFullYear(), kini.getMonth() - i, 1);
      const kunci = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      keluar.push(ada.get(kunci) ?? { label: kunci, billed: 0, paid: 0 });
    }
    return keluar;
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Palet donat. Warna tegar dan bukan pembolehubah tema: ia mengenal
   * pasti hirisan, jadi ia mesti kekal sama antara tema — kategori yang
   * bertukar warna apabila pengguna menukar tema menjadikan carta sukar
   * dibaca merentas sesi.
   */
  readonly palet = [
    '#DC1F2A', '#2563EB', '#16A34A', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1'
  ];

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.dashboard().subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan dashboard.');
        this.loading.set(false);
      }
    });
  }

  // ---------- Carta bar ----------

  /**
   * Siling paksi Y — dibundarkan ke atas kepada nombor kemas.
   *
   * Chart.js melakukan ini sendiri; tanpanya bar tertinggi sentiasa
   * menyentuh bahagian atas dan carta kelihatan penuh walaupun nilainya
   * kecil. Pembundaran mengikut magnitud supaya RM411 menjadi siling
   * RM500 dan bukan RM411.
   */
  readonly siling = computed(() => {
    const t = this.trendPenuh();
    const m = Math.max(0, ...t.map(p => Math.max(p.billed, p.paid)));
    if (m <= 0) return 100;

    const magnitud = Math.pow(10, Math.floor(Math.log10(m)));
    const langkah = magnitud / 2;
    return Math.ceil(m / langkah) * langkah;
  });

  /** Empat tanda paksi termasuk sifar, dari atas ke bawah. */
  readonly tanda = computed(() => {
    const atas = this.siling();
    return [4, 3, 2, 1, 0].map(i => atas * i / 4);
  });

  /** Label paksi: RM 1.5k bila besar, RM 350 bila kecil. */
  labelPaksi(v: number): string {
    if (this.siling() >= 1000) {
      return 'RM ' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
    }
    return 'RM ' + v.toFixed(0);
  }

  tinggi(nilai: number): number {
    return Math.round(nilai / this.siling() * 100);
  }

  /** '2026-08' -> 'Ogo'. */
  labelBulan(ym: string): string {
    const bulan = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
                   'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    const idx = Number(ym.slice(5, 7)) - 1;
    return bulan[idx] ?? ym;
  }

  // ---------- Carta donat ----------

  readonly jumlahKategori = computed(() =>
    (this.data()?.byCategory ?? []).reduce((s, c) => s + c.amount, 0) || 1);

  /**
   * Donat dibina dengan conic-gradient — satu harta CSS, tiada SVG dan
   * tiada perpustakaan carta.
   *
   * Chart.js membawa kira-kira 200KB untuk dua carta yang boleh dibuat
   * dalam beberapa baris, dan ia memerlukan kod tambahan untuk mengikut
   * tema portal.
   */
  readonly donatGradient = computed(() => {
    const cats = this.data()?.byCategory ?? [];
    const jumlah = this.jumlahKategori();
    if (!cats.length) return 'conic-gradient(var(--line) 0 100%)';

    let mula = 0;
    const hirisan = cats.map((c, i) => {
      const tamat = mula + (c.amount / jumlah) * 100;
      const warna = this.palet[i % this.palet.length];
      const seg = `${warna} ${mula.toFixed(2)}% ${tamat.toFixed(2)}%`;
      mula = tamat;
      return seg;
    });
    return `conic-gradient(${hirisan.join(', ')})`;
  });

  warna(i: number): string { return this.palet[i % this.palet.length]; }

  peratus(n: number): number {
    return Math.round(n / this.jumlahKategori() * 100);
  }

  keInvois() { this.router.navigate(['/portal/expenses/invoices']); }
  keBayar() { this.router.navigate(['/portal/expenses/payments']); }
}
