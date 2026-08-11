import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ExpensesService, ExpCashbookRow, ExpCashRow,
  ExpCategory, ExpPaymentMethod
} from './expenses.service';

/** Satu baris dalam borang tambah catatan. */
interface BarisCatatan {
  parentId: number | null;
  categoryId: number | null;
  amount: number | null;
  description: string;
}

@Component({
  selector: 'app-exp-cashbook',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cashbook.component.html',
  styleUrl: './expenses.scss'
})
export class ExpCashbookComponent {
  private api = inject(ExpensesService);

  readonly rows = signal<ExpCashbookRow[]>([]);
  readonly cashRows = signal<ExpCashRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly source = signal<'ALL' | 'PV' | 'TERUS'>('ALL');
  q = '';
  from = '';
  to = '';

  readonly categories = signal<ExpCategory[]>([]);
  readonly methods = signal<ExpPaymentMethod[]>([]);

  readonly chips = [
    { k: 'ALL' as const, l: 'Semua' },
    { k: 'PV' as const, l: 'Dari PV' },
    { k: 'TERUS' as const, l: 'Catatan Terus' }
  ];

  readonly induk = computed(() =>
    this.categories().filter(c => c.parentId === null && c.active));

  jenisBagi(parentId: number | null): ExpCategory[] {
    if (parentId === null) return [];
    return this.categories().filter(c => c.parentId === parentId && c.active);
  }

  onParentChange(it: BarisCatatan) { it.categoryId = null; }

  readonly visible = computed(() => {
    const cari = this.q.trim().toLowerCase();
    return this.rows()
      .filter(r => this.source() === 'ALL' || r.source === this.source())
      .filter(r => !cari
        || r.docNo.toLowerCase().includes(cari)
        || r.description.toLowerCase().includes(cari));
  });

  readonly jumlah = computed(() =>
    this.visible().reduce((s, r) => s + r.amount, 0));

  // Borang tambah catatan
  readonly formOpen = signal(false);
  entryDate = new Date().toISOString().slice(0, 10);
  payee = '';
  method = '';
  refNo = '';
  items: BarisCatatan[] = [{ parentId: null, categoryId: null, amount: null, description: '' }];

  constructor() {
    this.load();
    this.api.categories().subscribe({ next: c => this.categories.set(c), error: () => {} });
    this.api.methods().subscribe({
      next: m => {
        this.methods.set(m.filter(x => x.active));
        if (!this.method && this.methods().length) this.method = this.methods()[0].name;
      },
      error: () => {}
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.cashbook(this.from || null, this.to || null).subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan buku tunai.');
        this.loading.set(false);
      }
    });
  }

  clearFilter() {
    this.q = ''; this.from = ''; this.to = '';
    this.source.set('ALL');
    this.load();
  }

  formSubtotal(): number {
    return this.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  }

  // ---------- Tambah catatan ----------

  openNew() {
    this.entryDate = new Date().toISOString().slice(0, 10);
    this.payee = ''; this.refNo = '';
    if (!this.method && this.methods().length) this.method = this.methods()[0].name;
    this.items = [{ parentId: null, categoryId: null, amount: null, description: '' }];
    this.error.set(null);
    this.formOpen.set(true);
  }

  addItem() {
    this.items = [...this.items, { parentId: null, categoryId: null, amount: null, description: '' }];
  }

  removeItem(i: number) {
    this.items = this.items.filter((_, x) => x !== i);
    if (!this.items.length) this.addItem();
  }

  closeForm() { this.formOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.formOpen()) this.closeForm(); }

  /**
   * Setiap baris menjadi SATU catatan berasingan.
   *
   * exp_cash_entry ialah satu baris satu rekod: setiap satu mempunyai
   * kategorinya sendiri dan diposkan ke akaun GL sendiri. Menggabungkan
   * beberapa kategori dalam satu rekod bermakna posting perlu memecahkannya
   * semula, dan pembatalan tidak lagi boleh dibuat per kategori.
   *
   * Akibatnya setiap baris mendapat nombor baucar sendiri.
   */
  save() {
    if (!this.payee.trim()) { this.error.set('Penerima wajib diisi.'); return; }
    if (!this.entryDate) { this.error.set('Tarikh wajib diisi.'); return; }

    const lines = this.items.filter(i => i.categoryId && Number(i.amount) > 0);
    if (!lines.length) {
      this.error.set('Tambah sekurang-kurangnya satu baris dengan kategori dan amaun.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    // Dihantar satu demi satu: setiap baris ialah rekod berasingan dengan
    // nombor baucar sendiri, dan backend menjananya dalam transaksi.
    let baki = lines.length;
    let gagal = false;

    for (const l of lines) {
      this.api.recordCash({
        entryDate: this.entryDate,
        categoryId: l.categoryId,
        payee: this.payee.trim(),
        description: l.description || null,
        amount: Number(l.amount),
        method: this.method,
        refNo: this.refNo || null
      }).subscribe({
        next: () => {
          if (--baki === 0 && !gagal) {
            this.saving.set(false);
            this.formOpen.set(false);
            this.load();
          }
        },
        error: e => {
          gagal = true;
          this.error.set(e?.error?.message ?? 'Gagal menyimpan catatan.');
          this.saving.set(false);
        }
      });
    }
  }

  /**
   * Batal catatan terus.
   *
   * Buku tunai memaparkan nombor dokumen, bukan id — jadi rekod dicari
   * melalui senarai catatan terus. PV dibatalkan dari skrin Bayaran.
   */
  cancel(r: ExpCashbookRow) {
    if (r.source === 'PV') {
      this.error.set('Batalkan bayaran PV dari skrin Bayaran / PV.');
      return;
    }

    const reason = prompt(`Batalkan catatan ${r.docNo}?\n\nSebab pembatalan:`);
    if (reason === null) return;
    if (!reason.trim()) { this.error.set('Sebab pembatalan diperlukan.'); return; }

    this.api.cashEntries(null, null, 0, 500).subscribe({
      next: page => {
        const e = page.items.find(x => x.voucherNo === r.docNo);
        if (!e) { this.error.set('Rekod tidak dijumpai.'); return; }
        this.api.cancelCash(e.id, reason.trim()).subscribe({
          next: () => this.load(),
          error: err => this.error.set(err?.error?.message ?? 'Gagal membatalkan.')
        });
      },
      error: err => this.error.set(err?.error?.message ?? 'Gagal mencari rekod.')
    });
  }
}
