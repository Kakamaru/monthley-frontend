import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface MyCampaign {
  id: number; slug: string; title: string; description: string | null;
  posterUrl: string | null; spCode: string; spName: string;
  targetAmount: number | null; raised: number; donors: number;
  presets: number[]; minAmount: number | null;
  allowCustom: boolean; allowAnonymous: boolean;
}

/**
 * Sumbangan — sisi pelanggan.
 *
 * Berbeza daripada borang awam: kempen ditapis kepada SP yang pelanggan
 * mempunyai akaun dengannya, dan maklumat penderma tidak diminta kerana
 * profil sudah membawanya.
 */
@Component({
  selector: 'app-my-donations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-donations.component.html',
  styleUrl: './my-donations.component.scss'
})
export class MyDonationsComponent {
  private http = inject(HttpClient);

  readonly rows = signal<MyCampaign[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly open = signal(false);
  readonly aktif = signal<MyCampaign | null>(null);
  readonly busy = signal(false);
  readonly modalError = signal<string | null>(null);

  amaun: number | null = null;
  anonymous = false;

  /**
   * Maklumat penderma — diisi daripada profil, boleh diubah.
   *
   * Telefon selalunya tiada dalam profil, dan sesetengah orang menderma
   * bagi pihak keluarga. Memaksa nilai profil bermakna borang menolak
   * derma yang sah.
   */
  nama = '';
  emel = '';
  telefon = '';

  private profilDimuat = false;

  readonly fee = signal<{ amount: number; fee: number; charged: number;
                          absorb: boolean } | null>(null);
  private feeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly hasil = signal<{ ok: boolean; msg: string;
                            receiptNo?: string; amount?: number } | null>(null);

  constructor() {
    this.muat();
    this.muatProfil();
    this.semakKembali();
  }

  private muatProfil() {
    this.http.get<{ name: string | null; email: string | null; phone: string | null }>(
      '/api/v1/donations/my/profile').subscribe({
      next: p => {
        this.nama = p.name ?? '';
        this.emel = p.email ?? '';
        this.telefon = p.phone ?? '';
        this.profilDimuat = true;
      },
      // Borang masih berfungsi tanpa profil — pengguna menaip sendiri.
      error: () => { this.profilDimuat = true; }
    });
  }

  muat() {
    this.loading.set(true);
    this.http.get<MyCampaign[]>('/api/v1/donations/my/campaigns').subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan kutipan.');
        this.loading.set(false);
      }
    });
  }

  private semakKembali() {
    const ref = new URLSearchParams(location.search).get('derma');
    if (!ref) return;

    this.http.get<any>(`/api/v1/pub/donations/status/${ref}`).subscribe({
      next: st => {
        if (st.status === 'SUCCESS') {
          this.hasil.set({
            ok: true, msg: 'Terima kasih. Sumbangan anda telah diterima.',
            receiptNo: st.receiptNo, amount: st.amount
          });
          this.muat();
        } else if (st.status === 'FAILED') {
          this.hasil.set({ ok: false, msg: 'Bayaran tidak berjaya.' });
        } else {
          this.hasil.set({ ok: true, msg: 'Sumbangan sedang diproses…' });
          setTimeout(() => this.semakKembali(), 4000);
        }
      },
      error: () => { /* rujukan tidak dikenali */ }
    });
  }

  buka(c: MyCampaign) {
    this.aktif.set(c);
    this.amaun = c.presets.length ? c.presets[0] : null;
    this.anonymous = false;
    this.fee.set(null);
    this.modalError.set(null);
    this.open.set(true);
    if (this.amaun) this.mintaFee();
  }

  tutup() { this.open.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.open()) this.tutup(); }

  pilihAmaun(v: number) { this.amaun = v; this.mintaFee(); }
  amaunBerubah() { this.mintaFee(); }

  private mintaFee() {
    const c = this.aktif();
    const a = Number(this.amaun);
    if (!c || !a || a <= 0) { this.fee.set(null); return; }

    if (this.feeTimer) clearTimeout(this.feeTimer);
    this.feeTimer = setTimeout(() => {
      this.http.post<any>(`/api/v1/donations/my/${c.slug}/preview`,
        { amount: a }).subscribe({
        next: f => this.fee.set(f),
        error: () => this.fee.set(null)
      });
    }, 300);
  }

  /** Kaedah, bukan computed: amaun ialah medan biasa yang diikat ngModel. */
  halangan(): string | null {
    const c = this.aktif();
    if (!c) return null;
    const a = Number(this.amaun);
    if (!a || a <= 0) return 'Masukkan jumlah sumbangan.';
    if (c.minAmount && a < c.minAmount) {
      return `Jumlah minimum ialah MYR ${c.minAmount.toFixed(2)}.`;
    }
    if (!this.anonymous && !this.nama.trim()) return 'Nama diperlukan.';
    if (!this.emel.trim()) return 'E-mel diperlukan untuk resit.';
    return null;
  }

  bolehHantar(): boolean {
    return !this.busy() && this.halangan() === null;
  }

  disentuh = false;
  tandaSentuh() { this.disentuh = true; }

  hantar() {
    const c = this.aktif();
    if (!c) return;

    this.busy.set(true);
    this.modalError.set(null);

    this.http.post<any>(`/api/v1/donations/my/${c.slug}/donate`, {
      amount: Number(this.amaun),
      anonymous: this.anonymous,
      donorName: this.nama.trim() || null,
      donorEmail: this.emel.trim() || null,
      donorPhone: this.telefon.trim() || null
    }).subscribe({
      next: r => { window.location.href = r.paymentUrl; },
      error: e => {
        this.busy.set(false);
        this.modalError.set(e?.error?.message ?? 'Gagal memulakan bayaran.');
      }
    });
  }

  peratus(c: MyCampaign): number {
    if (!c.targetAmount || c.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((c.raised / c.targetAmount) * 100));
  }
}
