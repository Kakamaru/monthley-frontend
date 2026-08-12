import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeRequestService, ChangeRequestRow } from './change-requests.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';

@Component({
  selector: 'app-change-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-requests.component.html'
})
export class ChangeRequestsComponent {
  private api = inject(ChangeRequestService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly rows = signal<ChangeRequestRow[]>([]);
  readonly loading = signal(false);
  readonly busy = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  readonly filter = signal<string>('PENDING');

  readonly tabs = [
    { k: 'PENDING',  l: 'Menunggu' },
    { k: 'APPROVED', l: 'Diluluskan' },
    { k: 'REJECTED', l: 'Ditolak' },
    { k: 'ALL',      l: 'Semua' }
  ];

  // Modal tolak — sebab wajib, jadi ia perlu borang dan bukan prompt.
  readonly rejectOpen = signal(false);
  readonly rejectFor = signal<ChangeRequestRow | null>(null);
  rejectNote = '';

  readonly pendingCount = computed(() =>
    this.rows().filter(r => r.status === 'PENDING').length);

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    const f = this.filter() === 'ALL' ? null : this.filter();
    this.api.list(f).subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan permohonan.');
        this.loading.set(false);
      }
    });
  }

  setFilter(k: string) { this.filter.set(k); this.load(); }

  labelJenis(r: ChangeRequestRow): string {
    switch (r.type) {
      case 'MODULE_ADD':  return 'Tambah modul';
      case 'MODULE_END':  return 'Henti modul';
      case 'PLAN_CHANGE': return 'Tukar pelan';
      default: return r.type;
    }
  }

  labelPerkara(r: ChangeRequestRow): string {
    if (r.type === 'PLAN_CHANGE') return r.planName ?? '—';
    return r.moduleName ?? r.moduleCode ?? '—';
  }

  /**
   * Luluskan dengan pengesahan yang menyatakan KESANNYA.
   *
   * Superadmin perlu tahu bil bermula bila sebelum menekan — kelulusan
   * mencipta langganan sebenar, bukan sekadar menukar bendera.
   */
  async approve(r: ChangeRequestRow) {
    const kesan = r.type === 'MODULE_ADD'
      ? 'Modul aktif serta-merta. Bil bermula 1 haribulan bulan berikutnya.'
      : r.type === 'MODULE_END'
      ? 'SP boleh guna sehingga hujung bulan ini. Bil berhenti selepas itu.'
      : 'Pelan lama tamat hujung bulan; pelan baharu bermula 1 haribulan.';

    const ya = await this.confirm.ask({
      title: 'Luluskan Permohonan',
      message: `${this.labelJenis(r)} — ${this.labelPerkara(r)} untuk ${r.spName}?`,
      detail: kesan,
      confirmText: 'Ya, luluskan'
    });
    if (!ya) return;

    this.busy.set(r.id);
    this.api.approve(r.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success('Permohonan diluluskan.', `${r.spName} — ${this.labelPerkara(r)}`);
        this.load();
      },
      error: e => {
        this.busy.set(null);
        this.toast.error(e?.error?.message ?? 'Gagal meluluskan.');
      }
    });
  }

  openReject(r: ChangeRequestRow) {
    this.rejectFor.set(r);
    this.rejectNote = '';
    this.rejectOpen.set(true);
  }

  closeReject() { this.rejectOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.rejectOpen()) this.closeReject(); }

  reject() {
    const r = this.rejectFor();
    if (!r) return;
    if (!this.rejectNote.trim()) {
      this.toast.error('Sebab penolakan diperlukan — SP akan melihatnya.');
      return;
    }

    this.busy.set(r.id);
    this.api.reject(r.id, this.rejectNote.trim()).subscribe({
      next: () => {
        this.busy.set(null);
        this.rejectOpen.set(false);
        this.toast.success('Permohonan ditolak.', 'SP akan melihat sebab yang diberikan.');
        this.load();
      },
      error: e => {
        this.busy.set(null);
        this.toast.error(e?.error?.message ?? 'Gagal menolak.');
      }
    });
  }

  bila(iso: string | null): string {
    if (!iso) return '—';
    return iso.replace('T', ' ').slice(0, 16);
  }
}
