import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpNoticeComponent } from './module-notice.component';
import { ModuleService } from '../../core/services/module.service';
import { ExpensesService, ExpCategory, GlOption } from './expenses.service';

/** Induk dengan anaknya — bentuk yang skrin perlukan. */
interface Induk {
  row: ExpCategory;
  kids: ExpCategory[];
}

@Component({
  selector: 'app-exp-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpNoticeComponent],
  templateUrl: './categories.component.html',
  styleUrl: './expenses.scss'
})
export class ExpCategoriesComponent {
  private api = inject(ExpensesService);
  readonly modules = inject(ModuleService);

  readonly rows = signal<ExpCategory[]>([]);
  readonly gls = signal<GlOption[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly formOpen = signal(false);
  readonly editing = signal<ExpCategory | null>(null);
  /** Bila menambah jenis: induknya. Null bermakna kategori induk baharu. */
  readonly parentFor = signal<ExpCategory | null>(null);

  name = '';
  glAccountId: number | null = null;

  /**
   * Senarai datang dari backend dalam susunan pokok — induk diikuti
   * anaknya. Dikumpul semula di sini untuk paparan satu baris per induk.
   */
  readonly tree = computed<Induk[]>(() => {
    const semua = this.rows();
    const out: Induk[] = [];
    for (const c of semua) {
      if (c.parentId === null) {
        out.push({ row: c, kids: semua.filter(k => k.parentId === c.id) });
      }
    }
    return out;
  });

  readonly tajukModal = computed(() => {
    if (this.editing()) return 'Rename Kategori';
    return this.parentFor() ? 'Jenis Baru' : 'Kategori Induk Baru';
  });

  constructor() {
    this.load();
    this.api.glAccounts().subscribe({
      next: g => this.gls.set(g),
      error: () => this.gls.set([])
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.categories().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan kategori.');
        this.loading.set(false);
      }
    });
  }

  newParent() {
    this.editing.set(null); this.parentFor.set(null);
    this.name = ''; this.glAccountId = null;
    this.error.set(null); this.formOpen.set(true);
  }

  newChild(induk: ExpCategory) {
    this.editing.set(null); this.parentFor.set(induk);
    this.name = ''; this.glAccountId = null;
    this.error.set(null); this.formOpen.set(true);
  }

  edit(c: ExpCategory) {
    this.editing.set(c);
    this.parentFor.set(c.parentId === null ? null : this.rows().find(r => r.id === c.parentId) ?? null);
    this.name = c.name;
    this.glAccountId = c.glAccountId;
    this.error.set(null); this.formOpen.set(true);
  }

  close() { this.formOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.formOpen()) this.close(); }

  save() {
    if (!this.name.trim()) { this.error.set('Nama wajib diisi.'); return; }
    this.saving.set(true); this.error.set(null);

    const ed = this.editing();
    const parent = this.parentFor();
    const body = {
      name: this.name.trim(),
      parentId: parent ? parent.id : null,
      // GL hanya bermakna pada induk; backend memaksanya null pada anak.
      glAccountId: parent ? null : this.glAccountId,
      active: true
    };

    this.api.saveCategory(body, ed?.id).subscribe({
      next: () => { this.saving.set(false); this.formOpen.set(false); this.load(); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal menyimpan kategori.');
        this.saving.set(false);
      }
    });
  }

  deactivate(c: ExpCategory) {
    if (!confirm(`Nyahaktifkan "${c.name}"?`)) return;
    this.api.deactivateCategory(c.id).subscribe({
      next: () => this.load(),
      error: e => this.error.set(e?.error?.message ?? 'Gagal menyahaktifkan.')
    });
  }

  glLabel(id: number | null): string {
    if (id === null) return 'Perbelanjaan Am (lalai)';
    const g = this.gls().find(x => x.id === id);
    return g ? `${g.code} ${g.name}` : '—';
  }
}
