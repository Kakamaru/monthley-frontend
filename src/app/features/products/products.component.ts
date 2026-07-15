import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/product.model';
import { ProductsService } from './products.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
  private api = inject(ProductsService);

  // keadaan skrin
  readonly activeTab = signal<boolean>(true);      // true = Active Products
  readonly rows = signal<Product[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // kriteria carian
  searchName = '';

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => {
    const t = this.total();
    if (t === 0) return 'Tiada rekod';
    const from = this.page() * this.size() + 1;
    const to = Math.min(t, from + this.size() - 1);
    return `${from}–${to} daripada ${t}`;
  });

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({
      active: this.activeTab(),
      q: this.searchName || null,
      page: this.page(),
      size: this.size()
    }).subscribe({
      next: r => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
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
    this.page.set(0);
    this.load();
  }

  goPage(p: number) {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  pageNumbers(): number[] {
    const n = this.totalPages();
    return Array.from({ length: Math.min(n, 5) }, (_, i) => i);
  }

  freqLabel(f: string): string {
    const map: Record<string, string> = {
      MONTHLY: 'Bulanan', QUARTERLY: 'Suku Tahun', HALF_YEAR: 'Setengah Tahun',
      YEAR: 'Tahunan', ONE_TIME: 'Sekali', PER_USE: 'Ikut Guna'
    };
    return map[f] ?? f;
  }
}
