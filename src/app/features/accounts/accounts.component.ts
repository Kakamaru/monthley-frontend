import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Account } from '../../core/models/account.model';
import { AccountsService } from './accounts.service';
import { ProductsService, ProductCategory } from '../products/products.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss'
})
export class AccountsComponent {
  private api = inject(AccountsService);
  private catalog = inject(ProductsService);

  /** grid columns — sama dengan prototaip */
  readonly cols = '1fr 1.6fr 1.6fr 1.1fr 150px';

  readonly activeTab = signal(true);
  readonly searchOpen = signal(true);
  readonly rows = signal<Account[]>([]);
  readonly categories = signal<ProductCategory[]>([]);
  readonly products = signal<Product[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  fAccount = '';
  fName = '';
  fCategory: number | null = null;
  fBalFrom = '';
  fBalTo = '';
  fLinked: '' | 'true' | 'false' = '';
  fProdCategory: number | null = null;
  fProduct: number | null = null;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => {
    const t = this.total();
    const from = t ? this.page() * this.size() + 1 : 0;
    const to = Math.min(this.page() * this.size() + this.size(), t);
    return `Menunjukkan ${from}–${to} daripada ${t}`;
  });

  constructor() {
    this.catalog.categories().subscribe({ next: c => this.categories.set(c), error: () => {} });
    this.catalog.list({ active: true, page: 0, size: 100 })
      .subscribe({ next: r => this.products.set(r.items), error: () => {} });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    const q = [this.fAccount, this.fName].filter(Boolean).join(' ').trim();
    this.api.list({
      active: this.activeTab(),
      linked: this.fLinked === '' ? null : this.fLinked === 'true',
      q: q || null,
      page: this.page(),
      size: this.size()
    }).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.error.set('Gagal memuatkan akaun. Pastikan backend berjalan di :8080.');
        this.loading.set(false);
        console.error(e);
      }
    });
  }

  toggleSearch() { this.searchOpen.set(!this.searchOpen()); }

  switchTab(active: boolean) {
    if (this.activeTab() === active) return;
    this.activeTab.set(active);
    this.page.set(0);
    this.load();
  }

  search() { this.page.set(0); this.load(); }

  clear() {
    this.fAccount = ''; this.fName = ''; this.fCategory = null;
    this.fBalFrom = ''; this.fBalTo = ''; this.fLinked = '';
    this.fProdCategory = null; this.fProduct = null;
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

  /** Format seperti prototaip: "MYR 12,000.00" */
  fmtBal(v: number): string {
    return 'MYR ' + (v ?? 0).toLocaleString('en-MY', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  /** Merah bila ada tunggakan, hijau bila bersih — seperti prototaip. */
  balColor(v: number): string {
    return (v ?? 0) > 0 ? 'var(--red)' : 'var(--green)';
  }
}
