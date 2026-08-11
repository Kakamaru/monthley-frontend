import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpNoticeComponent } from './module-notice.component';
import { ModuleService } from '../../core/services/module.service';
import {
  ExpensesService, ExpInvoiceRow, ExpInvoiceDetail,
  ExpSupplier, ExpCategory, ExpPaymentMethod
} from './expenses.service';

/**
 * Satu baris dalam borang invois.
 *
 * parentId disimpan pada baris walaupun backend hanya memerlukan
 * categoryId: dropdown Jenis ditapis mengikut kategori yang dipilih.
 * Satu senarai 92 jenis memaksa pengguna mengingati jenis mana milik
 * kategori mana, dan tiada apa menghalang pilihan yang tidak masuk akal.
 */
interface BarisItem {
  parentId: number | null;
  categoryId: number | null;
  description: string;
  amount: number | null;
}

@Component({
  selector: 'app-exp-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpNoticeComponent],
  templateUrl: './invoices.component.html',
  styleUrl: './expenses.scss'
})
export class ExpInvoicesComponent {
  private api = inject(ExpensesService);
  readonly modules = inject(ModuleService);

  readonly rows = signal<ExpInvoiceRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly filter = signal<string>('ALL');
  q = '';

  // Rujukan untuk borang
  readonly suppliers = signal<ExpSupplier[]>([]);
  readonly categories = signal<ExpCategory[]>([]);
  readonly methods = signal<ExpPaymentMethod[]>([]);

  /** Kategori induk untuk dropdown pertama. */
  readonly induk = computed(() =>
    this.categories().filter(c => c.parentId === null && c.active));

  /** Jenis di bawah satu induk. */
  jenisBagi(parentId: number | null): ExpCategory[] {
    if (parentId === null) return [];
    return this.categories().filter(c => c.parentId === parentId && c.active);
  }

  /** Menukar kategori mengosongkan jenis — jenis lama milik induk lain. */
  onParentChange(it: BarisItem) {
    it.categoryId = null;
  }

  // Borang daftar invois
  readonly formOpen = signal(false);
  supplierId: number | null = null;
  invNo = '';
  invDate = new Date().toISOString().slice(0, 10);
  dueDate = '';
  note = '';
  items: BarisItem[] = [{ parentId: null, categoryId: null, description: '', amount: null }];

  // Modal lihat
  readonly viewOpen = signal(false);
  readonly detail = signal<ExpInvoiceDetail | null>(null);

  // Modal bayar
  readonly payOpen = signal(false);
  readonly payFor = signal<ExpInvoiceRow | null>(null);
  payAmount: number | null = null;
  payDate = new Date().toISOString().slice(0, 10);
  payMethod = '';
  payRefNo = '';

  readonly chips = [
    { k: 'ALL', l: 'Semua' },
    { k: 'UNPAID', l: 'Belum Bayar' },
    { k: 'PARTIAL', l: 'Sebahagian' },
    { k: 'SETTLED', l: 'Selesai' }
  ];

  readonly visible = computed(() => {
    const cari = this.q.trim().toLowerCase();
    if (!cari) return this.rows();
    return this.rows().filter(r =>
      r.invNo.toLowerCase().includes(cari) ||
      r.supplierName.toLowerCase().includes(cari));
  });

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  /**
   * Jumlah borang semasa — pengguna nampak sebelum menyimpan.
   *
   * Kaedah biasa, bukan computed(): items ialah array mutable dan bukan
   * signal, jadi computed() tidak pernah dinilai semula apabila pengguna
   * menaip. Senarai baris invois terlalu pendek untuk penilaian setiap
   * pusingan menjadi kos.
   */
  formSubtotal(): number {
    return this.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  }

  constructor() {
    this.load();
    this.api.suppliers().subscribe({ next: s => this.suppliers.set(s), error: () => {} });
    this.api.categories().subscribe({ next: c => this.categories.set(c), error: () => {} });
    this.api.methods().subscribe({
      next: m => {
        this.methods.set(m.filter(x => x.active));
        if (!this.payMethod && this.methods().length) this.payMethod = this.methods()[0].name;
      },
      error: () => {}
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    const f = this.filter() === 'ALL' ? null : this.filter();
    this.api.invoices(f, this.page(), this.size()).subscribe({
      next: r => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan invois.');
        this.loading.set(false);
      }
    });
  }

  setFilter(k: string) { this.filter.set(k); this.page.set(0); this.load(); }
  goPage(p: number) {
    if (p < 0 || p >= this.pages()) return;
    this.page.set(p); this.load();
  }

  // ---------- Daftar invois ----------

  openNew() {
    this.supplierId = null;
    this.invNo = '';
    this.invDate = new Date().toISOString().slice(0, 10);
    this.dueDate = ''; this.note = '';
    this.items = [{ parentId: null, categoryId: null, description: '', amount: null }];
    this.error.set(null);
    this.formOpen.set(true);
  }

  addItem() { this.items = [...this.items, { parentId: null, categoryId: null, description: '', amount: null }]; }
  removeItem(i: number) {
    this.items = this.items.filter((_, x) => x !== i);
    if (!this.items.length) this.addItem();
  }

  closeForm() { this.formOpen.set(false); }

  save() {
    if (!this.supplierId) { this.error.set('Pembekal wajib dipilih.'); return; }
    if (!this.invNo.trim()) { this.error.set('No. invois wajib diisi.'); return; }
    if (!this.invDate) { this.error.set('Tarikh invois wajib diisi.'); return; }

    const lines = this.items
      .filter(i => i.categoryId && Number(i.amount) > 0)
      .map(i => ({
        categoryId: i.categoryId,
        description: i.description || null,
        amount: Number(i.amount)
      }));

    if (!lines.length) {
      this.error.set('Tambah sekurang-kurangnya satu baris dengan kategori dan amaun.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api.createInvoice({
      supplierId: this.supplierId,
      invNo: this.invNo.trim(),
      invDate: this.invDate,
      dueDate: this.dueDate || null,
      note: this.note || null,
      items: lines
    }).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.load(); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal menyimpan invois.');
        this.saving.set(false);
      }
    });
  }

  // ---------- Lihat ----------

  view(r: ExpInvoiceRow) {
    this.detail.set(null);
    this.viewOpen.set(true);
    this.api.invoice(r.id).subscribe({
      next: d => this.detail.set(d),
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan invois.');
        this.viewOpen.set(false);
      }
    });
  }

  closeView() { this.viewOpen.set(false); }

  // ---------- Bayar ----------

  openPay(r: ExpInvoiceRow) {
    this.payFor.set(r);
    this.payAmount = r.balance;
    this.payDate = new Date().toISOString().slice(0, 10);
    this.payRefNo = '';
    if (!this.payMethod && this.methods().length) this.payMethod = this.methods()[0].name;
    this.error.set(null);
    this.payOpen.set(true);
  }

  closePay() { this.payOpen.set(false); }

  pay() {
    const inv = this.payFor();
    if (!inv) return;
    const amt = Number(this.payAmount) || 0;
    if (amt <= 0) { this.error.set('Amaun mesti lebih daripada sifar.'); return; }
    if (amt > inv.balance) {
      this.error.set(`Amaun melebihi baki (RM${inv.balance.toFixed(2)}).`);
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api.pay({
      invoiceId: inv.id,
      payDate: this.payDate,
      amount: amt,
      method: this.payMethod,
      refNo: this.payRefNo || null
    }).subscribe({
      next: () => { this.saving.set(false); this.payOpen.set(false); this.load(); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal merekod bayaran.');
        this.saving.set(false);
      }
    });
  }

  // ---------- Batal ----------

  cancel(r: ExpInvoiceRow) {
    const reason = prompt(`Batalkan invois ${r.invNo}?\n\nSebab pembatalan:`);
    if (reason === null) return;
    if (!reason.trim()) { this.error.set('Sebab pembatalan diperlukan.'); return; }

    this.api.cancelInvoice(r.id, reason.trim()).subscribe({
      next: () => this.load(),
      error: e => this.error.set(e?.error?.message ?? 'Gagal membatalkan invois.')
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    // Satu lapisan pada satu masa, mengikut z-index.
    if (this.payOpen()) { this.closePay(); return; }
    if (this.viewOpen()) { this.closeView(); return; }
    if (this.formOpen()) { this.closeForm(); }
  }

  namaKategori(id: number): string {
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }
}
