import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, UserRow } from './users.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';

@Component({
  selector: 'app-platform-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html'
})
export class PlatformUsersComponent {
  private api = inject(UsersService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly cols = '1.6fr 1.4fr 1fr 1.4fr 0.8fr 100px';

  readonly rows = signal<UserRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  // modal tukar kata laluan
  readonly pwdTarget = signal<UserRow | null>(null);
  readonly pwdBusy = signal(false);
  readonly pwdError = signal<string | null>(null);
  newPassword = '';
  showPassword = false;

  fQ = '';
  fStatus = '';
  fRole = '';

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => {
    const t = this.total();
    const from = t ? this.page() * this.size() + 1 : 0;
    const to = Math.min(this.page() * this.size() + this.size(), t);
    return `Menunjukkan ${from}–${to} daripada ${t}`;
  });

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({
      q: this.fQ || null, status: this.fStatus || null, role: this.fRole || null,
      page: this.page(), size: this.size()
    }).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.toast.error('Gagal memuatkan senarai pengguna.');
        this.loading.set(false);
        console.error(e);
      }
    });
  }

  search() { this.page.set(0); this.load(); }

  clear() {
    this.fQ = ''; this.fStatus = ''; this.fRole = '';
    this.page.set(0);
    this.load();
  }

  goPage(p: number) {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  pageNumbers(): number[] {
    return Array.from({ length: Math.min(this.totalPages(), 5) }, (_, i) => i);
  }

  // ---------- tukar kata laluan ----------

  openPassword(u: UserRow) {
    this.pwdTarget.set(u);
    this.newPassword = '';
    this.showPassword = false;
    this.pwdError.set(null);
  }

  generatePassword() {
    this.api.generatePassword().subscribe({
      next: r => { this.newPassword = r.password; this.showPassword = true; },
      error: () => {}
    });
  }

  savePassword() {
    const u = this.pwdTarget();
    if (!u) return;
    if (this.newPassword.length < 6) {
      this.pwdError.set('Kata laluan minimum 6 aksara.');
      return;
    }
    this.pwdBusy.set(true);
    this.pwdError.set(null);
    this.api.changePassword(u.id, this.newPassword).subscribe({
      next: () => {
        this.pwdBusy.set(false);
        this.pwdTarget.set(null);
        this.toast.success('Kata laluan berjaya ditukar',
          `${u.email} — beritahu mereka secara selamat.`);
      },
      error: e => {
        this.pwdBusy.set(false);
        this.pwdError.set(e?.error?.message ?? 'Gagal menukar kata laluan.');
      }
    });
  }

  async toggleStatus(u: UserRow) {
    const off = u.status === 'ACTIVE';
    const next = off ? 'INACTIVE' : 'ACTIVE';

    if (off) {
      const ok = await this.confirm.ask({
        title: 'Nyahaktifkan Pengguna',
        message: `Nyahaktifkan ${u.fullName}?`,
        detail: 'Mereka tidak akan boleh log masuk sehingga diaktifkan semula.',
        confirmText: 'Ya, Nyahaktif',
        cancelText: 'Tidak',
        danger: true
      });
      if (!ok) return;
    }

    this.api.changeStatus(u.id, next).subscribe({
      next: () => {
        this.toast.success(off ? 'Pengguna dinyahaktifkan' : 'Pengguna diaktifkan', u.email);
        this.load();
      },
      error: () => this.toast.error('Gagal menukar status.')
    });
  }

  copyPassword() {
    navigator.clipboard?.writeText(this.newPassword);
    this.toast.info('Kata laluan disalin ke papan klip.');
  }

  /** Peranan diderive dari data — bukan medan tersimpan. */
  roleLabel(u: UserRow): string {
    if (u.spCount > 0) return 'SP Admin';
    if (u.accountCount > 0) return 'Pelanggan';
    return 'Belum dipautkan';
  }

  roleColor(u: UserRow): string {
    if (u.spCount > 0) return 'var(--green)';
    if (u.accountCount > 0) return 'var(--muted-2)';
    return 'var(--muted)';
  }
}
