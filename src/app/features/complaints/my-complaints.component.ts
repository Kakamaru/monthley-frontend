import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ComplaintsService, MyComplaintRow, MyDetail, MyAccount
} from './complaints.service';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-my-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-complaints.component.html',
  styleUrl: '../expenses/expenses.scss'
})
export class MyComplaintsComponent {
  private api = inject(ComplaintsService);
  private toast = inject(ToastService);

  readonly rows = signal<MyComplaintRow[]>([]);
  readonly accounts = signal<MyAccount[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  fStatus = 'ALL';
  fQ = '';

  readonly statusOpts = [
    { k: 'ALL', l: 'Semua' },
    { k: 'NEW', l: 'Baru' },
    { k: 'IN_PROGRESS', l: 'Dalam Proses' },
    { k: 'RESOLVED', l: 'Selesai' },
    { k: 'REOPENED', l: 'Dibuka Semula' }
  ];

  readonly visible = computed(() => {
    const cari = this.fQ.trim().toLowerCase();
    if (!cari) return this.rows();
    return this.rows().filter(r =>
      r.subject.toLowerCase().includes(cari) ||
      r.complaintNo.toLowerCase().includes(cari));
  });

  // Buat aduan
  readonly newOpen = signal(false);
  nAccountId: number | null = null;
  nCategoryId: number | null = null;
  readonly nCategories = signal<{ id: number; name: string }[]>([]);
  nSubject = '';
  nDetail = '';

  // Detail
  readonly detailOpen = signal(false);
  readonly detail = signal<MyDetail | null>(null);
  rMessage = '';

  constructor() {
    this.load();
    this.api.myAccounts().subscribe({
      next: a => this.accounts.set(a),
      error: () => this.accounts.set([])
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.myList(this.fStatus).subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan aduan.');
        this.loading.set(false);
      }
    });
  }

  setStatus(k: string) { this.fStatus = k; this.load(); }

  labelStatus(s: string): string {
    switch (s) {
      case 'NEW': return 'BARU';
      case 'IN_PROGRESS': return 'DALAM PROSES';
      case 'RESOLVED': return 'SELESAI';
      case 'REOPENED': return 'DIBUKA SEMULA';
      default: return s;
    }
  }

  bila(iso: string | null): string {
    if (!iso) return '—';
    return iso.replace('T', ' ').slice(0, 16);
  }

  // ---------- Buat aduan ----------

  openNew() {
    this.nAccountId = null; this.nCategoryId = null;
    this.nCategories.set([]);
    this.nSubject = ''; this.nDetail = '';
    this.error.set(null);
    this.newOpen.set(true);
  }

  closeNew() { this.newOpen.set(false); }

  /**
   * Kategori dimuatkan selepas akaun dipilih.
   *
   * Setiap SP mempunyai kategori sendiri — memaparkan semuanya bercampur
   * bermakna pelanggan memilih kategori yang tidak wujud pada SP yang
   * menerima aduannya.
   */
  onAccountChange() {
    this.nCategoryId = null;
    this.nCategories.set([]);
    if (!this.nAccountId) return;
    this.api.myCategories(this.nAccountId).subscribe({
      next: c => this.nCategories.set(c),
      error: () => this.nCategories.set([])
    });
  }

  saveNew() {
    if (!this.nAccountId) { this.error.set('Pilih akaun terlebih dahulu.'); return; }
    if (!this.nSubject.trim()) { this.error.set('Tajuk aduan wajib diisi.'); return; }

    this.saving.set(true);
    this.error.set(null);

    this.api.myCreate({
      accountId: this.nAccountId,
      categoryId: this.nCategoryId,
      subject: this.nSubject.trim(),
      detail: this.nDetail || null
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.newOpen.set(false);
        this.toast.success('Aduan dihantar.',
          'Anda akan menerima maklum balas daripada pihak pengurusan.');
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.message ?? 'Gagal menghantar aduan.');
      }
    });
  }

  // ---------- Detail ----------

  open(r: MyComplaintRow) {
    this.detail.set(null);
    this.rMessage = '';
    this.detailOpen.set(true);
    this.api.myGet(r.id).subscribe({
      next: d => this.detail.set(d),
      error: e => {
        this.toast.error(e?.error?.message ?? 'Gagal memuatkan aduan.');
        this.detailOpen.set(false);
      }
    });
  }

  closeDetail() { this.detailOpen.set(false); }

  sendReply() {
    const d = this.detail();
    if (!d || !this.rMessage.trim()) return;

    this.saving.set(true);
    this.api.myReply(d.header.id, this.rMessage.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.rMessage = '';
        // Muat semula supaya balasan baharu dan status yang mungkin
        // berubah (aduan selesai jadi dibuka semula) kedua-duanya
        // kelihatan.
        this.api.myGet(d.header.id).subscribe({ next: x => this.detail.set(x) });
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.toast.error(e?.error?.message ?? 'Gagal menghantar balasan.');
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.newOpen()) { this.closeNew(); return; }
    if (this.detailOpen()) { this.closeDetail(); }
  }
}
