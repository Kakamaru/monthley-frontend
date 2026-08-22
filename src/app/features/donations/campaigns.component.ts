import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DonationsService, Campaign, SaveCampaign } from './donations.service';

/**
 * Kutipan Derma — sisi SP.
 *
 * Kempen ialah borang bayaran yang dikongsi melalui pautan awam. Yang
 * paling penting pada skrin ini ialah PAUTAN: SP menciptanya untuk
 * dikongsi dalam WhatsApp, jadi ia mesti mudah disalin.
 */
@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.scss'
})
export class CampaignsComponent {
  private api = inject(DonationsService);

  readonly rows = signal<Campaign[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);

  readonly uploading = signal(false);

  /** Salinan boleh ubah — 'Batal' mesti benar-benar membatalkan. */
  f: SaveCampaign = this.kosong();

  /** Amaun pantas sebagai senarai, lebih mudah diedit daripada rentetan. */
  presets: string[] = ['10', '50', '100'];

  readonly jenisKempen = [
    { v: 'DERMA', l: 'Derma' },
    { v: 'TABUNG', l: 'Tabung Khas' },
    { v: 'YURAN', l: 'Yuran Aktiviti' },
    { v: 'ZAKAT', l: 'Zakat' }
  ];

  constructor() { this.muat(); }

  private kosong(): SaveCampaign {
    return {
      title: '', description: null, posterUrl: null,
      campaignType: 'DERMA', slug: '', status: 'DRAFT',
      startDate: null, endDate: null,
      targetAmount: null, presetAmounts: '10,50,100', minAmount: null,
      allowCustom: true,
      requireName: true, requireEmail: true, requirePhone: false,
      requireAccount: false, allowAnonymous: true,
      absorbFee: null, autoReceipt: true
    };
  }

  muat() {
    this.loading.set(true);
    this.error.set(null);
    this.api.senarai().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan kempen.');
        this.loading.set(false);
      }
    });
  }

  // ---------- Borang ----------

  bukaTambah() {
    this.f = this.kosong();
    this.presets = ['10', '50', '100'];
    this.editingId.set(null);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  bukaEdit(c: Campaign) {
    this.f = {
      title: c.title, description: c.description, posterUrl: c.posterUrl,
      campaignType: c.campaignType, slug: c.slug, status: c.status,
      startDate: c.startDate, endDate: c.endDate,
      targetAmount: c.targetAmount, presetAmounts: c.presetAmounts,
      minAmount: c.minAmount, allowCustom: c.allowCustom,
      requireName: c.requireName, requireEmail: c.requireEmail,
      requirePhone: c.requirePhone, requireAccount: c.requireAccount,
      allowAnonymous: c.allowAnonymous, absorbFee: c.absorbFee,
      autoReceipt: c.autoReceipt
    };
    this.presets = (c.presetAmounts ?? '').split(',')
      .map(x => x.trim()).filter(Boolean);
    this.editingId.set(c.id);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  tutupForm() { this.formOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.formOpen()) this.tutupForm(); }

  /**
   * Slug dijana daripada tajuk, tetapi hanya untuk kempen BARU.
   *
   * Menukarnya pada kempen sedia ada memecahkan setiap pautan yang sudah
   * dikongsi — dan SP tidak boleh menarik balik mesej WhatsApp.
   */
  tajukBerubah() {
    if (this.editingId() !== null) return;
    this.f.slug = (this.f.title ?? '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  tambahPreset() {
    if (this.presets.length >= 4) return;
    this.presets = [...this.presets, ''];
  }

  buangPreset(i: number) {
    this.presets = this.presets.filter((_, idx) => idx !== i);
  }

  async pilihPoster(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Disemak di sini JUGA, bukan hanya di backend: memuat naik 5MB
    // untuk ditolak membazir masa pengguna pada sambungan mudah alih.
    if (file.size > 2 * 1024 * 1024) {
      this.formError.set('Saiz gambar melebihi 2MB.');
      input.value = '';
      return;
    }
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      this.formError.set('Hanya fail JPEG atau PNG dibenarkan.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.formError.set(null);

    this.api.muatNaikPoster(file).subscribe({
      next: r => { this.f.posterUrl = r.url; this.uploading.set(false); },
      error: e => {
        this.formError.set(e?.error?.message ?? 'Gagal memuat naik gambar.');
        this.uploading.set(false);
      }
    });
    input.value = '';
  }

  simpan() {
    if (!this.f.title?.trim()) {
      this.formError.set('Nama kutipan diperlukan.');
      return;
    }
    if (!this.f.slug?.trim()) {
      this.formError.set('Pautan awam diperlukan.');
      return;
    }

    this.f.presetAmounts = this.presets
      .map(x => x.trim()).filter(Boolean).join(',');

    this.saving.set(true);
    this.formError.set(null);

    const selesai = () => {
      this.saving.set(false);
      this.formOpen.set(false);
      this.ok.set('Kempen disimpan.');
      setTimeout(() => this.ok.set(null), 4000);
      this.muat();
    };
    const gagal = (e: any) => {
      this.saving.set(false);
      this.formError.set(e?.error?.message ?? 'Gagal menyimpan kempen.');
    };

    const id = this.editingId();
    if (id === null) {
      this.api.cipta(this.f).subscribe({ next: selesai, error: gagal });
    } else {
      this.api.kemasKini(id, this.f).subscribe({ next: selesai, error: gagal });
    }
  }

  // ---------- Papar ----------

  pautan(slug: string): string {
    return `${location.origin}/derma/${slug}`;
  }

  salinPautan(slug: string) {
    navigator.clipboard.writeText(this.pautan(slug)).then(() => {
      this.ok.set('Pautan disalin.');
      setTimeout(() => this.ok.set(null), 2500);
    });
  }

  peratus(c: Campaign): number {
    if (!c.targetAmount || c.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((c.raised / c.targetAmount) * 100));
  }

  warnaStatus(s: string): { bg: string; c: string } {
    switch (s) {
      case 'ACTIVE': return { bg: '#e7f6ec', c: '#128a41' };
      case 'CLOSED': return { bg: '#f1f5f2', c: '#6b7f86' };
      default:       return { bg: '#fdf4e3', c: '#a3691f' };   // DRAFT
    }
  }

  labelStatus(s: string): string {
    switch (s) {
      case 'ACTIVE': return 'Aktif';
      case 'CLOSED': return 'Ditutup';
      default:       return 'Draf';
    }
  }

  readonly jumlahTerkumpul = computed(() =>
    this.rows().reduce((t, c) => t + c.raised, 0));

  readonly jumlahPenderma = computed(() =>
    this.rows().reduce((t, c) => t + c.donors, 0));

  readonly bilAktif = computed(() =>
    this.rows().filter(c => c.status === 'ACTIVE').length);
}
