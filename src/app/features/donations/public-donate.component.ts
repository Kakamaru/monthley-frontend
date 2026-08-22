import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface PublicCampaign {
  slug: string; title: string; description: string | null;
  posterUrl: string | null; spName: string;
  targetAmount: number | null; raised: number; donors: number;
  presets: number[]; minAmount: number | null; allowCustom: boolean;
  requireName: boolean; requireEmail: boolean; requirePhone: boolean;
  requireAccount: boolean; allowAnonymous: boolean;
}

/**
 * Borang derma awam — TIADA log masuk.
 *
 * Penderma ialah orang luar: mereka membuka pautan daripada WhatsApp,
 * memilih amaun, dan membayar. Setiap langkah tambahan kehilangan derma.
 */
@Component({
  selector: 'app-public-donate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-donate.component.html',
  styleUrl: './public-donate.component.scss'
})
export class PublicDonateComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  readonly slug = signal('');
  readonly kempen = signal<PublicCampaign | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  amaun: number | null = null;
  nama = '';
  emel = '';
  telefon = '';
  akaun = '';
  anonymous = false;

  readonly fee = signal<{ amount: number; fee: number; charged: number;
                          absorb: boolean } | null>(null);
  private feeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Hasil selepas penderma kembali dari gerbang. */
  readonly hasil = signal<{ ok: boolean; msg: string;
                            receiptNo?: string; amount?: number } | null>(null);

  constructor() {
    const s = this.route.snapshot.paramMap.get('slug')
           ?? new URLSearchParams(location.search).get('slug')
           ?? location.pathname.split('/').filter(Boolean).pop()
           ?? '';
    this.slug.set(s);
    this.muat();
    this.semakKembali();
  }

  private muat() {
    this.http.get<PublicCampaign>(`/api/v1/pub/donations/${this.slug()}`).subscribe({
      next: c => {
        this.kempen.set(c);
        this.loading.set(false);
        // Amaun pertama dipilih secara lalai: satu ketukan kurang untuk
        // penderma yang menerima cadangan.
        if (c.presets.length) { this.amaun = c.presets[0]; this.mintaFee(); }
      },
      error: e => {
        this.error.set(e?.error?.message
          ?? 'Kempen tidak dijumpai atau sudah ditutup.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Penderma kembali daripada gerbang dengan ?ref= dalam URL.
   *
   * Status datang daripada BACKEND, bukan daripada URL — apa-apa dalam
   * URL boleh ditaip semula.
   */
  private semakKembali() {
    const ref = new URLSearchParams(location.search).get('ref');
    if (!ref) return;

    this.http.get<any>(`/api/v1/pub/donations/status/${ref}`).subscribe({
      next: st => {
        if (st.status === 'SUCCESS') {
          this.hasil.set({
            ok: true,
            msg: 'Terima kasih. Sumbangan anda telah diterima.',
            receiptNo: st.receiptNo, amount: st.amount
          });
          this.muat();   // jumlah terkumpul dikemas kini
        } else if (st.status === 'FAILED') {
          this.hasil.set({ ok: false, msg: 'Bayaran tidak berjaya. Sila cuba lagi.' });
        } else {
          this.hasil.set({ ok: true, msg: 'Sumbangan sedang diproses…' });
          setTimeout(() => this.semakKembali(), 4000);
        }
      },
      error: () => { /* rujukan tidak dikenali — abaikan */ }
    });
  }

  pilihAmaun(v: number) {
    this.amaun = v;
    this.mintaFee();
  }

  amaunBerubah() { this.mintaFee(); }

  private mintaFee() {
    const a = Number(this.amaun);
    if (!a || a <= 0) { this.fee.set(null); return; }

    if (this.feeTimer) clearTimeout(this.feeTimer);
    this.feeTimer = setTimeout(() => {
      this.http.post<any>(`/api/v1/pub/donations/${this.slug()}/preview`,
        { amount: a }).subscribe({
        next: f => this.fee.set(f),
        error: () => this.fee.set(null)
      });
    }, 350);
  }

  readonly peratus = computed(() => {
    const c = this.kempen();
    if (!c?.targetAmount || c.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((c.raised / c.targetAmount) * 100));
  });

  /**
   * Apa yang menghalang penghantaran, atau null jika sedia.
   *
   * Mesej dan bukan boolean: butang yang mati tanpa sebab kelihatan
   * seperti sistem rosak, dan penderma tidak akan meneka bahawa minimum
   * kempen ialah RM50.
   */
  halangan(): string | null {
    const c = this.kempen();
    if (!c) return 'Kempen tidak dimuatkan.';

    const a = Number(this.amaun);
    if (!a || a <= 0) return 'Masukkan jumlah sumbangan.';
    if (c.minAmount && a < c.minAmount) {
      return `Jumlah minimum ialah MYR ${c.minAmount.toFixed(2)}.`;
    }
    if (c.requireName && !this.anonymous && !this.nama.trim()) {
      return 'Nama diperlukan.';
    }
    if (c.requireEmail && !this.emel.trim()) return 'E-mel diperlukan.';
    if (c.requirePhone && !this.telefon.trim()) return 'No. telefon diperlukan.';
    return null;
  }

  bolehHantar(): boolean {
    return !this.busy() && this.halangan() === null;
  }

  /**
   * Mesej halangan hanya selepas pengguna mula mengisi.
   *
   * Menunjukkannya pada borang kosong bermakna penderma dimarahi sebelum
   * menaip apa-apa.
   */
  disentuh = false;

  tandaSentuh() { this.disentuh = true; }

  hantar() {
    const c = this.kempen();
    if (!c) return;

    this.busy.set(true);
    this.error.set(null);

    this.http.post<any>(`/api/v1/pub/donations/${this.slug()}/donate`, {
      amount: Number(this.amaun),
      donorName: this.nama.trim() || null,
      donorEmail: this.emel.trim() || null,
      donorPhone: this.telefon.trim() || null,
      donorAccount: this.akaun.trim() || null,
      anonymous: this.anonymous
    }).subscribe({
      next: r => { window.location.href = r.paymentUrl; },
      error: e => {
        this.busy.set(false);
        this.error.set(e?.error?.message ?? 'Gagal memulakan bayaran.');
      }
    });
  }
}
