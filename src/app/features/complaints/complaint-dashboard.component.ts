import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ComplaintsService, AduDashboard } from './complaints.service';

@Component({
  selector: 'app-complaint-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './complaint-dashboard.component.html',
  styleUrl: '../expenses/expenses.scss'
})
export class ComplaintDashboardComponent {
  private api = inject(ComplaintsService);
  private router = inject(Router);

  readonly data = signal<AduDashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly palet = [
    '#DC1F2A', '#2563EB', '#16A34A', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#EC4899', '#84CC16'
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
   * Enam bulan PENUH — bulan tanpa aduan diisi sifar.
   *
   * Query hanya memulangkan bulan yang mempunyai data. Jurang dalam siri
   * masa mengelirukan: pengguna tidak boleh membezakan 'tiada aduan'
   * daripada 'tiada data'.
   */
  readonly trendPenuh = computed(() => {
    const ada = new Map((this.data()?.trend ?? []).map(p => [p.label, p]));
    const keluar = [];
    const kini = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(kini.getFullYear(), kini.getMonth() - i, 1);
      const kunci = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      keluar.push(ada.get(kunci) ?? { label: kunci, received: 0, resolved: 0 });
    }
    return keluar;
  });

  readonly siling = computed(() => {
    const t = this.trendPenuh();
    const m = Math.max(0, ...t.map(p => Math.max(p.received, p.resolved)));
    if (m <= 0) return 4;
    const magnitud = Math.pow(10, Math.floor(Math.log10(m)));
    const langkah = Math.max(1, magnitud / 2);
    return Math.ceil(m / langkah) * langkah;
  });

  readonly tanda = computed(() => {
    const atas = this.siling();
    return [4, 3, 2, 1, 0].map(i => Math.round(atas * i / 4));
  });

  tinggi(n: number): number { return Math.round(n / this.siling() * 100); }

  labelBulan(ym: string): string {
    const bulan = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
                   'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    return bulan[Number(ym.slice(5, 7)) - 1] ?? ym;
  }

  // ---------- Kategori ----------

  readonly maxKategori = computed(() =>
    Math.max(1, ...(this.data()?.byCategory ?? []).map(c => c.count)));

  lebar(n: number): number { return Math.round(n / this.maxKategori() * 100); }

  warna(i: number): string { return this.palet[i % this.palet.length]; }

  // ---------- Donat kadar selesai ----------

  readonly donat = computed(() => {
    const k = Number(this.data()?.kadarSelesai ?? 0);
    return `conic-gradient(#16A34A 0% ${k}%, var(--bg-soft) ${k}% 100%)`;
  });

  labelPriority(p: string): string {
    switch (p) {
      case 'HIGH': return 'Tinggi';
      case 'MEDIUM': return 'Sederhana';
      case 'LOW': return 'Rendah';
      default: return p;
    }
  }

  keSenarai() { this.router.navigate(['/portal/complaints/list']); }
}
