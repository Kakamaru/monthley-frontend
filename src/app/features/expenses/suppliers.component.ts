import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpNoticeComponent } from './module-notice.component';
import { ModuleService } from '../../core/services/module.service';
import { ExpensesService, ExpSupplier } from './expenses.service';

@Component({
  selector: 'app-exp-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpNoticeComponent],
  templateUrl: './suppliers.component.html',
  styleUrl: './expenses.scss'
})
export class ExpSuppliersComponent {
  private api = inject(ExpensesService);
  readonly modules = inject(ModuleService);

  readonly rows = signal<ExpSupplier[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  q = '';
  name = ''; regNo = ''; tin = ''; address = '';
  phone = ''; email = ''; bankName = ''; bankAccNo = '';
  active = true;

  readonly visible = computed(() => {
    const cari = this.q.trim().toLowerCase();
    return this.rows()
      .filter(r => !cari
        || r.name.toLowerCase().includes(cari)
        || (r.phone ?? '').toLowerCase().includes(cari)
        || (r.email ?? '').toLowerCase().includes(cari));
  });

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.suppliers().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan pembekal.');
        this.loading.set(false);
      }
    });
  }

  openNew() {
    this.editingId.set(null);
    this.name = ''; this.regNo = ''; this.tin = ''; this.address = '';
    this.phone = ''; this.email = ''; this.bankName = ''; this.bankAccNo = '';
    this.active = true;
    this.error.set(null);
    this.formOpen.set(true);
  }

  openEdit(s: ExpSupplier) {
    this.editingId.set(s.id);
    this.name = s.name;
    this.regNo = s.regNo ?? '';
    this.tin = s.tin ?? '';
    this.address = s.address ?? '';
    this.phone = s.phone ?? '';
    this.email = s.email ?? '';
    this.bankName = s.bankName ?? '';
    this.bankAccNo = s.bankAccNo ?? '';
    this.active = s.active;
    this.error.set(null);
    this.formOpen.set(true);
  }

  close() { this.formOpen.set(false); }

  /**
   * Escape menutup modal — jangkaan biasa yang prototaip asal tiada.
   *
   * Satu lapisan sahaja di skrin ini, tetapi corak dikekalkan sama dengan
   * AccountsComponent supaya skrin modul yang berlapis kemudian tidak
   * perlu mereka semula.
   */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.formOpen()) { this.close(); }
  }

  save() {
    if (!this.name.trim()) {
      this.error.set('Nama pembekal wajib diisi.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const body = {
      name: this.name.trim(), regNo: this.regNo || null, tin: this.tin || null,
      address: this.address || null, phone: this.phone || null,
      email: this.email || null, bankName: this.bankName || null,
      bankAccNo: this.bankAccNo || null, active: this.active
    };

    this.api.saveSupplier(body, this.editingId() ?? undefined).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.load(); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal menyimpan pembekal.');
        this.saving.set(false);
      }
    });
  }

}
