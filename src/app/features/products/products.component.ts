import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/product.model';
import { ProductsService, ProductCategory } from './products.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
  private api = inject(ProductsService);

  /** grid columns — sama dengan prototaip */
  readonly cols = '0.7fr 1fr 1.1fr 1.5fr 0.9fr 1fr 0.8fr 130px';

  readonly activeTab = signal(true);
  readonly rows = signal<Product[]>([]);
  readonly categories = signal<ProductCategory[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  searchName = '';
  category: number | null = null;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => {
    const t = this.total();
    const from = t ? this.page() * this.size() + 1 : 0;
    const to = Math.min(this.page() * this.size() + this.size(), t);
    return `Menunjukkan ${from}–${to} daripada ${t}`;
  });

  constructor() {
    this.loadCategories();
    this.load();
  }

  loadCategories() {
    this.api.categories().subscribe({
      next: c => this.categories.set(c),
      error: () => this.categories.set([])
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({
      active: this.activeTab(),
      category: this.category,
      q: this.searchName || null,
      page: this.page(),
      size: this.size()
    }).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.error.set('Gagal memuatkan produk. Pastikan backend berjalan di :8080.');
        this.loading.set(false);
        console.error(e);
      }
    });
  }

  switchTab(active: boolean) {
    if (this.activeTab() === active) return;
    this.activeTab.set(active);
    this.page.set(0);
    this.load();
  }

  search() { this.page.set(0); this.load(); }

  clear() {
    this.searchName = '';
    this.category = null;
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

  categoryName(id?: number | null): string {
    if (id == null) return '—';
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  freqLabel(f: string): string {
    const map: Record<string, string> = {
      MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEAR: 'Half Year',
      YEAR: 'Yearly', ONE_TIME: 'One Off', PER_USE: 'Per Used'
    };
    return map[f] ?? f;
  }
}
