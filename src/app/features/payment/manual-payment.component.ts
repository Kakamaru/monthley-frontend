import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentLineRow, OutstandingAccountRow, PaymentService, OutstandingRow, PaymentType, PaymentResult } from './payment.service';
import { ProductsService, ProductCategory } from '../products/products.service';
import { ToastService } from '../../core/ui/toast.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-manual-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manual-payment.component.html'
})
export class ManualPaymentComponent {
  private api = inject(PaymentService);
  private catalog = inject(ProductsService);
  private toast = inject(ToastService);

  readonly cols = '0.9fr 2fr 1.2fr 1.1fr 90px';

  readonly rows = signal<OutstandingRow[]>([]);
  readonly types = signal<PaymentType[]>([]);
  readonly categories = signal<ProductCategory[]>([]);
  readonly products = signal<Product[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  // Dua tab: 'account' (group by akaun) | 'invoice' (per invois)
  readonly tab = signal<'account' | 'invoice'>('account');
  readonly accountRows = signal<OutstandingAccountRow[]>([]);
  readonly accountTotal = signal(0);
  readonly accountPage = signal(0);
  readonly accountPageSize = 10;
  fAccName = '';   // filter nama untuk tab account
  readonly searched = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly searchOpen = signal(true);

  // ── Page bayaran (redesign att 1-3) ──
  readonly payMode = signal(false);              // true = page bayaran terbuka
  readonly payAccount = signal<{ no: string; name: string; balance: number; accountId: number } | null>(null);
  readonly payInvoices = signal<OutstandingRow[]>([]);   // semua invois outstanding akaun
  readonly paySelected = signal<Set<number>>(new Set());  // documentId dipilih
  readonly payPage = signal(0);
  // Expand: documentId -> baris txn (breakdown)
  readonly expandedDoc = signal<number | null>(null);
  readonly docLines = signal<Record<number, DocumentLineRow[]>>({});
  // Pilihan txn: documentId -> Set(lineId)
  txnPick: Record<number, Set<number>> = {};
  readonly payPageSize = 10;
  readonly payBusy = signal(false);
  mIdempotencyKey = '';   // token elak double-entry (ADR 0004)
  readonly payError = signal<string | null>(null);
  readonly result = signal<PaymentResult | null>(null);   // success screen bila set
  readonly showConfirm = signal(false);          // popup confirm (att 2)

  // borang bayaran
  readonly methodOptions = [
    { code: 'CASH', label: 'Cash' },
    { code: 'TRANSFER', label: 'Bank Transfer' },
    { code: 'CHEQUE', label: 'Cheque' },
    { code: 'FPX', label: 'FPX / Online' },
    { code: 'ADJUSTMENT', label: 'Penyelarasan' }
  ];
  mMethod = 'CASH';
  mDate = new Date().toISOString().slice(0, 10);
  mBank = '';
  mBankBranch = '';
  mRefNo = '';
  mNotes = '';
  mAmount = 0;

  fAccount = '';
  fInvoice = '';
  fCategory: number | null = null;
  fProduct: number | null = null;



  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => `Total ${this.total()} items`);

  constructor() {
    this.api.paymentTypes().subscribe({ next: t => this.types.set(t), error: () => {} });
    this.catalog.categories().subscribe({ next: c => this.categories.set(c), error: () => {} });
    this.catalog.list({ active: true, page: 0, size: 100 })
      .subscribe({ next: r => this.products.set(r.items), error: () => {} });
  }

  search() {
    this.page.set(0);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.searched.set(true);
    this.api.outstanding({
      account: this.fAccount || null, invoice: this.fInvoice || null,
      category: this.fCategory, product: this.fProduct,
      page: this.page(), size: this.size()
    }).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan invois.');
        this.loading.set(false);
      }
    });
  }

  switchTab(t: 'account' | 'invoice') {
    this.tab.set(t);
    if (t === 'account') this.loadAccounts();
    else this.load();
  }

  loadAccounts() {
    this.loading.set(true);
    this.api.outstandingAccounts({
      account: this.fAccount || null,
      name: this.fAccName || null,
      page: this.accountPage(),
      size: this.accountPageSize
    }).subscribe({
      next: r => { this.accountRows.set(r.items); this.accountTotal.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  accountTotalPages(): number { return Math.max(1, Math.ceil(this.accountTotal() / this.accountPageSize)); }
  accountGoPage(n: number) { if (n >= 0 && n < this.accountTotalPages()) { this.accountPage.set(n); this.loadAccounts(); } }
  accountPageNumbers(): number[] { return Array.from({ length: this.accountTotalPages() }, (_, i) => i); }

  // Buka page bayaran dari tab Account (guna accountId + no terus)
  openPayAccount(a: OutstandingAccountRow) {
    this.payAccount.set({ no: a.accountNo, name: a.accountName, balance: a.balance, accountId: a.accountId });
    this.payError.set(null);
    this.result.set(null);
    this.showConfirm.set(false);
    this.paySelected.set(new Set());
    this.payPage.set(0);
    this.mMethod = 'CASH';
    this.mDate = new Date().toISOString().slice(0, 10);
    this.mBank = ''; this.mBankBranch = ''; this.mRefNo = ''; this.mNotes = ''; this.mAmount = 0;
    this.mIdempotencyKey = crypto.randomUUID();   // sesi bayar baru = key baru
    this.api.outstanding({ account: a.accountNo, invoice: null, category: null, product: null, page: 0, size: 200 })
      .subscribe({
        next: res => {
          this.payInvoices.set(res.items);
          this.payMode.set(true);
        },
        error: e => this.payError.set(e?.error?.message ?? 'Gagal memuatkan invois akaun.')
      });
  }

  clear() {
    this.fAccount = ''; this.fInvoice = '';
    this.fCategory = null; this.fProduct = null;
    this.rows.set([]); this.total.set(0);
    this.searched.set(false);
  }

  toggleSearch() { this.searchOpen.set(!this.searchOpen()); }

  goPage(p: number) {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  pageNumbers(): number[] {
    return Array.from({ length: Math.min(this.totalPages(), 5) }, (_, i) => i);
  }

  // ---------- modal ----------

  openPay(r: OutstandingRow) {
    // Buka page bayaran untuk AKAUN baris ini (att 1) — load semua invois outstanding akaun
    this.payAccount.set({ no: r.accountNo, name: r.accountName ?? r.accountNo, balance: 0, accountId: r.accountId });
    this.payError.set(null);
    this.result.set(null);
    this.showConfirm.set(false);
    this.paySelected.set(new Set());
    this.payPage.set(0);
    this.mMethod = 'CASH';
    this.mDate = new Date().toISOString().slice(0, 10);
    this.mBank = ''; this.mBankBranch = ''; this.mRefNo = ''; this.mNotes = ''; this.mAmount = 0;
    this.mIdempotencyKey = crypto.randomUUID();   // sesi bayar baru = key baru
    // Muat semua invois outstanding akaun ini
    this.api.outstanding({ account: r.accountNo, invoice: null, category: null, product: null, page: 0, size: 200 })
      .subscribe({
        next: res => {
          this.payInvoices.set(res.items);
          const bal = res.items.reduce((sum, i) => sum + (i.outstanding ?? 0), 0);
          const acc = this.payAccount();
          if (acc) this.payAccount.set({ ...acc, balance: bal });
          this.payMode.set(true);
        },
        error: e => this.payError.set(e?.error?.message ?? 'Gagal memuatkan invois akaun.')
      });
  }

  closePay() { this.payMode.set(false); this.payAccount.set(null); this.result.set(null); }

  toggleInvoice(docId: number) {
    const set = new Set(this.paySelected());
    const nowSelected = !set.has(docId);
    if (nowSelected) set.add(docId); else set.delete(docId);
    this.paySelected.set(set);

    // Sync txn dalam: tick invois -> tick semua txn; untick -> clear.
    const applyTxn = (lines: DocumentLineRow[]) => {
      if (nowSelected) this.txnPick[docId] = new Set(lines.map(l => l.lineId));
      else delete this.txnPick[docId];
      this.recalcAmount();
    };
    const cached = this.docLines()[docId];
    if (cached) {
      applyTxn(cached);
    } else if (nowSelected) {
      // Perlu lines untuk tick semua txn — muat dulu.
      this.api.documentLines(docId).subscribe({
        next: lines => { this.docLines.set({ ...this.docLines(), [docId]: lines }); applyTxn(lines); },
        error: () => this.recalcAmount()
      });
    } else {
      delete this.txnPick[docId];
      this.recalcAmount();
    }
  }
  invSelected(docId: number): boolean { return this.paySelected().has(docId); }

  toggleExpand(inv: OutstandingRow) {
    if (this.expandedDoc() === inv.documentId) { this.expandedDoc.set(null); return; }
    this.expandedDoc.set(inv.documentId);
    if (!this.docLines()[inv.documentId]) {
      this.api.documentLines(inv.documentId).subscribe({
        next: lines => this.docLines.set({ ...this.docLines(), [inv.documentId]: lines }),
        error: () => {}
      });
    }
  }
  linesFor(docId: number): DocumentLineRow[] { return this.docLines()[docId] || []; }

  txnChecked(docId: number, lineId: number): boolean {
    return this.txnPick[docId]?.has(lineId) ?? false;
  }
  toggleTxn(inv: OutstandingRow, line: DocumentLineRow) {
    const set = this.txnPick[inv.documentId] ?? new Set<number>();
    if (set.has(line.lineId)) set.delete(line.lineId); else set.add(line.lineId);
    this.txnPick[inv.documentId] = set;
    // Sync: kalau semua txn tick -> tick invois; kalau tiada -> untick
    const all = this.linesFor(inv.documentId);
    const invSet = new Set(this.paySelected());
    if (set.size === all.length && all.length > 0) invSet.add(inv.documentId);
    else if (set.size === 0) invSet.delete(inv.documentId);
    this.paySelected.set(invSet);
    this.recalcAmount();
  }

  recalcAmount() {
    // Amount di aras DOKUMEN (baki = outstanding). Txn cuma breakdown untuk pilih.
    // Tick semua txn -> guna baki dokumen (bukan jumlah amount asal txn, sebab
    //   sebahagian mungkin dah dibayar; baki dijaga di aras dokumen, bukan txn).
    // Tick separa txn -> jumlah txn ditick, tapi CAP pada baki dokumen.
    let total = 0;
    for (const inv of this.payInvoices()) {
      const txnSet = this.txnPick[inv.documentId];
      const outstanding = inv.outstanding ?? 0;
      const lines = this.linesFor(inv.documentId);
      if (this.paySelected().has(inv.documentId) && (!txnSet || txnSet.size === 0)) {
        total += outstanding;                       // invois penuh (tanpa expand)
      } else if (txnSet && txnSet.size > 0) {
        if (lines.length > 0 && txnSet.size === lines.length) {
          total += outstanding;                     // semua txn ditick = baki dokumen
        } else {
          let sub = 0;
          for (const line of lines) if (txnSet.has(line.lineId)) sub += line.amount;
          total += Math.min(sub, outstanding);      // separa: cap pada baki
        }
      }
    }
    this.mAmount = Math.round(total * 100) / 100;
  }

  // Bilangan item dipilih: invois penuh (tanpa txn separa) + txn individu ditick.
  pickedCount(): number {
    let n = 0;
    for (const inv of this.payInvoices()) {
      const txnSet = this.txnPick[inv.documentId];
      if (this.paySelected().has(inv.documentId) && (!txnSet || txnSet.size === 0)) n += 1;
      else if (txnSet && txnSet.size > 0) n += txnSet.size;
    }
    return n;
  }

  pagedInvoices() {
    const start = this.payPage() * this.payPageSize;
    return this.payInvoices().slice(start, start + this.payPageSize);
  }
  payTotalPages(): number { return Math.max(1, Math.ceil(this.payInvoices().length / this.payPageSize)); }
  payGoPage(n: number) { if (n >= 0 && n < this.payTotalPages()) this.payPage.set(n); }
  payPageNumbers(): number[] { return Array.from({ length: this.payTotalPages() }, (_, i) => i); }

  allOnPageSelected(): boolean {
    const page = this.pagedInvoices();
    return page.length > 0 && page.every(i => this.paySelected().has(i.documentId));
  }
  toggleSelectAll() {
    const set = new Set(this.paySelected());
    const page = this.pagedInvoices();
    if (this.allOnPageSelected()) page.forEach(i => set.delete(i.documentId));
    else page.forEach(i => set.add(i.documentId));
    this.paySelected.set(set);
    this.mAmount = this.payInvoices().filter(i => set.has(i.documentId)).reduce((s, i) => s + (i.outstanding ?? 0), 0);
  }

  selectedTotal(): number {
    return this.payInvoices()
      .filter(i => this.paySelected().has(i.documentId))
      .reduce((sum, i) => sum + (i.outstanding ?? 0), 0);
  }

  // att 2 — confirm popup
  askConfirm() {
    if (this.mAmount <= 0) { this.payError.set('Amaun mesti lebih daripada sifar.'); return; }
    // Tak pilih invois = auto FIFO (backend agih ke invois tertunggak). Partial dibenarkan.
    this.payError.set(null);
    this.showConfirm.set(true);
  }
  cancelConfirm() { this.showConfirm.set(false); }

  save() {
    this.showConfirm.set(false);
    this.payBusy.set(true);
    this.payError.set(null);
    const acc = this.payAccount();
    if (!acc) return;
    this.api.record({
      documentIds: Array.from(this.paySelected()),
      accountId: acc.accountId,
      paymentType: this.mMethod,
      paymentRefNo: this.mRefNo || undefined,
      paymentDate: this.mDate,
      amount: this.mAmount,
      remarks: this.mNotes || undefined,
      idempotencyKey: this.mIdempotencyKey
    }).subscribe({
      next: res => {
        this.payBusy.set(false);
        this.result.set(res);   // papar success screen (att 3)
      },
      error: e => {
        this.payBusy.set(false);
        this.payError.set(e?.error?.message ?? 'Gagal merekod bayaran.');
      }
    });
  }

  backToCounter() {
    this.result.set(null);
    this.payMode.set(false);
    this.payAccount.set(null);
    this.load();   // refresh listing
  }

  fmt(v: number): string {
    return 'MYR ' + (v ?? 0).toLocaleString('en-MY', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
}
