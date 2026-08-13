import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemoService, MemoRow } from './memo.service';
import { ModuleService } from '../../core/services/module.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';

@Component({
  selector: 'app-memo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './memo-list.component.html',
  styleUrl: '../expenses/expenses.scss'
})
export class MemoListComponent {
  private api = inject(MemoService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly modules = inject(ModuleService);

  readonly rows = signal<MemoRow[]>([]);

  /**
   * Penapis status.
   *
   * Ditapis di klien dan bukan melalui query: memo dikira dalam puluhan,
   * bukan ribuan, dan menapis di sini bermakna kiraan pada setiap chip
   * sentiasa tepat tanpa panggilan tambahan.
   */
  readonly tapis = signal<'ALL' | 'DRAFT' | 'LIVE' | 'EXPIRED'>('ALL');

  readonly chips = [
    { k: 'ALL' as const,     l: 'Semua' },
    { k: 'DRAFT' as const,   l: 'Draf' },
    { k: 'LIVE' as const,    l: 'Diterbit' },
    { k: 'EXPIRED' as const, l: 'Tamat' }
  ];

  kira(k: 'ALL' | 'DRAFT' | 'LIVE' | 'EXPIRED'): number {
    return this.rows().filter(m => this.padan(m, k)).length;
  }

  private padan(m: MemoRow, k: string): boolean {
    switch (k) {
      case 'DRAFT':   return m.status === 'DRAFT';
      case 'LIVE':    return m.status === 'PUBLISHED' && !m.expired;
      case 'EXPIRED': return m.status === 'PUBLISHED' && m.expired;
      default:        return true;
    }
  }

  readonly visible = computed(() =>
    this.rows().filter(m => this.padan(m, this.tapis())));
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly busy = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  /**
   * Memo yang sedang dibaca penuh.
   *
   * Isi dipotong pada kad supaya grid kekal kemas — satu memo panjang
   * tidak sepatutnya menolak semua yang lain. Modal untuk membaca penuh
   * dan bukan mengembang di tempat, kerana mengembang menukar tinggi kad
   * dan susunan grid melompat.
   */
  readonly readOpen = signal<MemoRow | null>(null);

  /** Isi cukup panjang untuk dipotong? */
  panjang(m: MemoRow): boolean {
    return m.body.length > 260 || m.body.split('\n').length > 5;
  }

  readonly formOpen = signal(false);
  readonly editing = signal<MemoRow | null>(null);
  fTitle = '';
  fBody = '';
  fExpires = '';

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan memo.');
        this.loading.set(false);
      }
    });
  }

  bila(iso: string | null): string {
    if (!iso) return '—';
    return iso.replace('T', ' ').slice(0, 16);
  }

  /** Label status yang menggabungkan terbit dan luput. */
  labelStatus(m: MemoRow): string {
    if (m.status === 'DRAFT') return 'DRAF';
    return m.expired ? 'LUPUT' : 'DITERBIT';
  }

  // ---------- Cipta / edit ----------

  openNew() {
    this.editing.set(null);
    this.fTitle = ''; this.fBody = ''; this.fExpires = '';
    this.error.set(null);
    this.formOpen.set(true);
  }

  openEdit(m: MemoRow) {
    this.editing.set(m);
    this.fTitle = m.title;
    this.fBody = m.body;
    this.fExpires = m.expiresOn ?? '';
    this.error.set(null);
    this.formOpen.set(true);
  }

  close() { this.formOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.readOpen()) { this.readOpen.set(null); return; }
    if (this.formOpen()) { this.close(); }
  }

  save() {
    if (!this.fTitle.trim()) { this.error.set('Tajuk wajib diisi.'); return; }
    if (!this.fBody.trim()) { this.error.set('Isi memo wajib diisi.'); return; }

    this.saving.set(true);
    this.error.set(null);

    this.api.save({
      title: this.fTitle.trim(),
      body: this.fBody.trim(),
      expiresOn: this.fExpires || null
    }, this.editing()?.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success('Memo disimpan.',
          this.editing() ? undefined : 'Terbitkan memo untuk memaparkannya kepada pelanggan.');
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.message ?? 'Gagal menyimpan memo.');
      }
    });
  }

  // ---------- Terbit / tarik balik / padam ----------

  async publish(m: MemoRow) {
    const ya = await this.confirm.ask({
      title: 'Terbitkan Memo',
      message: `Terbitkan "${m.title}"?`,
      detail: `Memo akan dipaparkan kepada ${m.audienceCount} pelanggan `
            + (m.expiresOn ? `sehingga ${m.expiresOn}.` : 'sehingga ditarik balik.'),
      confirmText: 'Ya, terbitkan'
    });
    if (!ya) return;

    this.busy.set(m.id);
    this.api.publish(m.id).subscribe({
      next: () => { this.busy.set(null); this.toast.success('Memo diterbitkan.'); this.load(); },
      error: e => {
        this.busy.set(null);
        this.toast.error(e?.error?.message ?? 'Gagal menerbitkan.');
      }
    });
  }

  /**
   * Tamatkan lebih awal.
   *
   * Berbeza daripada tarik balik: memo berpindah ke 'Memo Lama' pelanggan
   * dan rekod kekal menunjukkan ia pernah dihebahkan. Menariknya balik
   * menjadikan memo yang sudah dibaca kelihatan seolah-olah tidak pernah
   * wujud.
   */
  async endNow(m: MemoRow) {
    const ya = await this.confirm.ask({
      title: 'Tamatkan Memo',
      message: `Tamatkan "${m.title}" sekarang?`,
      detail: 'Memo berpindah ke "Memo Lama" pelanggan. Ia kekal sebagai rekod '
            + 'dan boleh dibaca semula, tetapi tidak lagi dipapar sebagai makluman aktif.',
      confirmText: 'Ya, tamatkan'
    });
    if (!ya) return;

    this.busy.set(m.id);
    this.api.endNow(m.id).subscribe({
      next: () => { this.busy.set(null); this.toast.success('Memo ditamatkan.'); this.load(); },
      error: e => {
        this.busy.set(null);
        this.toast.error(e?.error?.message ?? 'Gagal menamatkan.');
      }
    });
  }

  async unpublish(m: MemoRow) {
    const ya = await this.confirm.ask({
      title: 'Tarik Balik Memo',
      message: `Tarik balik "${m.title}"?`,
      detail: 'Memo akan hilang dari portal pelanggan dan kembali menjadi draf.',
      confirmText: 'Ya, tarik balik'
    });
    if (!ya) return;

    this.busy.set(m.id);
    this.api.unpublish(m.id).subscribe({
      next: () => { this.busy.set(null); this.toast.success('Memo ditarik balik.'); this.load(); },
      error: e => {
        this.busy.set(null);
        this.toast.error(e?.error?.message ?? 'Gagal menarik balik.');
      }
    });
  }

  async remove(m: MemoRow) {
    const ya = await this.confirm.askDelete(`memo "${m.title}"`,
      'Tindakan ini tidak boleh dibatalkan.');
    if (!ya) return;

    this.busy.set(m.id);
    this.api.remove(m.id).subscribe({
      next: () => { this.busy.set(null); this.toast.success('Memo dipadam.'); this.load(); },
      error: e => {
        this.busy.set(null);
        this.toast.error(e?.error?.message ?? 'Gagal memadam.');
      }
    });
  }
}
