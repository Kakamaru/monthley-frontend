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
  readonly cols = '0.7fr 1.1fr 1.5fr 0.9fr 1fr 0.8fr 130px';

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

  // ── Borang Add/Edit Product ──────────────────────────────────
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  editingId: number | null = null;

  // draft borang — nilai lalai padan design
  draft: {
    mainProduct: boolean; mandatory: boolean; prorated: boolean; latePenalty: boolean;
    code: string; categoryId: number | null; name: string; description: string;
    rate: number | null; chargeFrequency: string; anchorMonth: number | null;
  } = this.blankDraft();

  private blankDraft() {
    return {
      mainProduct: false, mandatory: false, prorated: false, latePenalty: false,
      code: '', categoryId: null, name: '', description: '',
      rate: null, chargeFrequency: 'MONTHLY', anchorMonth: null
    };
  }

  /** 6 frekuensi — Non-Recurring dibuang (= One Time). */
  readonly freqOptions = [
    { value: 'ONE_TIME',  label: 'One Time' },
    { value: 'MONTHLY',   label: 'Monthly Charge' },
    { value: 'QUARTERLY', label: 'Quarterly Charge' },
    { value: 'HALF_YEAR', label: 'Half Yearly Charge' },
    { value: 'YEAR',      label: 'Yearly Charge' },
    { value: 'PER_USE',   label: 'Per Use' }
  ];

  readonly bulanList = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Mac' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Julai' }, { value: 8, label: 'Ogos' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Disember' }
  ];

  /** Anchor hanya bermakna untuk kitaran > 1 bulan. */
  showAnchor(): boolean {
    return ['QUARTERLY', 'HALF_YEAR', 'YEAR'].includes(this.draft.chargeFrequency);
  }

  openAdd() {
    this.editingId = null;
    this.draft = this.blankDraft();
    this.formOpen.set(true);
  }

  closeForm() { this.formOpen.set(false); }

  openEdit(p: Product) {
    this.editingId = p.id;
    this.draft = {
      mainProduct: false,   // tiada dalam Product view; kekal false
      mandatory: p.mandatory,
      prorated: p.prorated,
      latePenalty: p.latePenalty,
      code: p.code,
      categoryId: p.categoryId ?? null,
      name: p.name,
      description: '',      // tiada dalam list view
      rate: p.rate,
      chargeFrequency: p.chargeFrequency,
      anchorMonth: p.anchorMonth ?? null
    };
    this.formOpen.set(true);
  }

  saveProduct() {
    if (!this.draft.code.trim() || !this.draft.name.trim() || this.draft.rate == null) {
      this.error.set('Kod, Nama dan Rate wajib diisi.');
      return;
    }
    this.saving.set(true);
    const body = {
      code: this.draft.code.trim(),
      name: this.draft.name.trim(),
      rate: this.draft.rate,
      chargeFrequency: this.draft.chargeFrequency as any,
      // anchor hanya dihantar bila relevan
      anchorMonth: this.showAnchor() ? this.draft.anchorMonth ?? undefined : undefined,
      categoryId: this.draft.categoryId ?? undefined,
      prorated: this.draft.prorated,
      latePenalty: this.draft.latePenalty,
      mandatory: this.draft.mainProduct ? true : this.draft.mandatory
    };
    const done = () => { this.saving.set(false); this.formOpen.set(false); this.page.set(0); this.load(); };
    const fail = (e: any) => { this.saving.set(false); this.error.set('Gagal menyimpan produk.'); console.error(e); };

    if (this.editingId == null) {
      this.api.create(body).subscribe({ next: done, error: fail });
    } else {
      this.api.update(this.editingId, body).subscribe({ next: done, error: fail });
    }
  }

  freqLabel(f: string): string {
    const map: Record<string, string> = {
      MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEAR: 'Half Year',
      YEAR: 'Yearly', ONE_TIME: 'One Off', PER_USE: 'Per Used'
    };
    return map[f] ?? f;
  }
}
