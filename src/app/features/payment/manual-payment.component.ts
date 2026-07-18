import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, OutstandingRow, PaymentType, PaymentResult } from './payment.service';
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
  readonly searched = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly searchOpen = signal(true);

  // modal bayaran
  readonly payTarget = signal<OutstandingRow | null>(null);
  readonly payBusy = signal(false);
  readonly payError = signal<string | null>(null);
  readonly result = signal<PaymentResult | null>(null);

  fAccount = '';
  fInvoice = '';
  fCategory: number | null = null;
  fProduct: number | null = null;

  // borang modal
  mType = 'CASH';
  mRefNo = '';
  mDate = new Date().toISOString().slice(0, 10);
  mAmount = 0;
  mRemarks = '';

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
    this.payTarget.set(r);
    this.mType = 'CASH';
    this.mRefNo = '';
    this.mDate = new Date().toISOString().slice(0, 10);
    this.mAmount = r.outstanding;     // lalai: bayar penuh
    this.mRemarks = '';
    this.payError.set(null);
    this.result.set(null);
  }

  save() {
    const r = this.payTarget();
    if (!r) return;
    if (this.mAmount <= 0) { this.payError.set('Amaun mesti lebih daripada sifar.'); return; }
    if (this.mAmount > r.outstanding) {
      this.payError.set(`Amaun melebihi baki tertunggak (MYR ${r.outstanding.toFixed(2)}). Lebihan akan menjadi deposit.`);
      // dibenarkan — cuma amaran
    }

    this.payBusy.set(true);
    this.payError.set(null);
    this.api.record({
      documentId: r.documentId, accountId: r.accountId,
      paymentType: this.mType, paymentRefNo: this.mRefNo || undefined,
      paymentDate: this.mDate, amount: this.mAmount, remarks: this.mRemarks || undefined
    }).subscribe({
      next: res => {
        this.payBusy.set(false);
        this.payTarget.set(null);
        this.toast.success(
          `Bayaran ${this.fmt(res.allocated)} direkod`,
          `Resit ${res.receiptNo}`
          + (res.deposit > 0 ? ` · Lebihan ${this.fmt(res.deposit)} menjadi deposit` : ''));
        this.load();
      },
      error: e => {
        this.payBusy.set(false);
        this.payError.set(e?.error?.message ?? 'Gagal merekod bayaran.');
      }
    });
  }

  fmt(v: number): string {
    return 'MYR ' + (v ?? 0).toLocaleString('en-MY', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
}
