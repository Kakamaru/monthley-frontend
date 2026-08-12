import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModuleCatalogService, ModuleRow, BusinessTypeOption, ProductOption
} from './modules.service';

@Component({
  selector: 'app-module-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './module-catalog.component.html'
})
export class ModuleCatalogComponent {
  private api = inject(ModuleCatalogService);

  readonly rows = signal<ModuleRow[]>([]);
  readonly sektor = signal<BusinessTypeOption[]>([]);
  readonly produk = signal<ProductOption[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly editing = signal<ModuleRow | null>(null);

  description = '';
  videoUrl = '';
  productId: number | null = null;
  sortOrder = 0;
  active = true;
  /** Kosong bermakna semua sektor. */
  pilihSektor = new Set<string>();

  constructor() {
    this.load();
    this.api.businessTypes().subscribe({ next: b => this.sektor.set(b), error: () => {} });
    this.api.products().subscribe({ next: p => this.produk.set(p), error: () => {} });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan katalog modul.');
        this.loading.set(false);
      }
    });
  }

  labelSektor(m: ModuleRow): string {
    if (!m.businessTypes.length) return 'Semua sektor';
    return m.businessTypes.join(', ');
  }

  edit(m: ModuleRow) {
    this.editing.set(m);
    this.description = m.description ?? '';
    this.videoUrl = m.videoUrl ?? '';
    this.productId = m.productId;
    this.sortOrder = m.sortOrder;
    this.active = m.active;
    this.pilihSektor = new Set(m.businessTypes);
    this.error.set(null);
    this.formOpen.set(true);
  }

  close() { this.formOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.formOpen()) this.close(); }

  toggleSektor(kod: string) {
    if (this.pilihSektor.has(kod)) this.pilihSektor.delete(kod);
    else this.pilihSektor.add(kod);
    // Set bermutasi di tempat, jadi salin untuk mencetuskan render.
    this.pilihSektor = new Set(this.pilihSektor);
  }

  dipilih(kod: string) { return this.pilihSektor.has(kod); }

  save() {
    const m = this.editing();
    if (!m) return;

    this.saving.set(true);
    this.error.set(null);

    this.api.save(m.code, {
      description: this.description || null,
      videoUrl: this.videoUrl || null,
      productId: this.productId,
      businessTypes: [...this.pilihSektor],
      sortOrder: Number(this.sortOrder) || 0,
      active: this.active
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.ok.set(`Modul ${m.name} dikemas kini.`);
        setTimeout(() => this.ok.set(null), 3000);
        this.load();
      },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal menyimpan.');
        this.saving.set(false);
      }
    });
  }
}
