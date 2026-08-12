import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplaintsService, AduCategory, AduSetting } from './complaints.service';
import { ModuleService } from '../../core/services/module.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';

@Component({
  selector: 'app-complaint-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './complaint-settings.component.html',
  styleUrl: '../expenses/expenses.scss'
})
export class ComplaintSettingsComponent {
  private api = inject(ComplaintsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  readonly modules = inject(ModuleService);

  readonly categories = signal<AduCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  // Tetapan
  prefix = 'ADU';
  noSize = 6;
  noStart = 1;
  slaDays = 5;

  // Modal kategori
  readonly catOpen = signal(false);
  readonly editing = signal<AduCategory | null>(null);
  cName = '';
  cSortOrder = 0;
  cActive = true;

  constructor() {
    this.load();
    this.loadSettings();
  }

  load() {
    this.loading.set(true);
    this.api.categories().subscribe({
      next: c => { this.categories.set(c); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan kategori.');
        this.loading.set(false);
      }
    });
  }

  loadSettings() {
    this.api.settings().subscribe({
      next: s => {
        this.prefix = s.prefix; this.noSize = s.noSize;
        this.noStart = s.noStart; this.slaDays = s.slaDays;
      },
      error: () => {}
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.api.saveSettings({
      prefix: this.prefix.trim() || 'ADU',
      noSize: Number(this.noSize) || 6,
      noStart: Number(this.noStart) || 1,
      slaDays: Number(this.slaDays) || 5
    }).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Tetapan disimpan.'); },
      error: e => {
        this.saving.set(false);
        this.toast.error(e?.error?.message ?? 'Gagal menyimpan tetapan.');
      }
    });
  }

  // ---------- Kategori ----------

  newCategory() {
    this.editing.set(null);
    this.cName = ''; this.cSortOrder = this.categories().length + 1; this.cActive = true;
    this.error.set(null);
    this.catOpen.set(true);
  }

  editCategory(c: AduCategory) {
    this.editing.set(c);
    this.cName = c.name; this.cSortOrder = c.sortOrder; this.cActive = c.active;
    this.error.set(null);
    this.catOpen.set(true);
  }

  closeCat() { this.catOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.catOpen()) this.closeCat(); }

  saveCategory() {
    if (!this.cName.trim()) { this.error.set('Nama kategori wajib diisi.'); return; }
    this.saving.set(true);
    this.error.set(null);

    this.api.saveCategory(
      { name: this.cName.trim(), sortOrder: Number(this.cSortOrder) || 0, active: this.cActive },
      this.editing()?.id
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.catOpen.set(false);
        this.toast.success('Kategori disimpan.');
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.message ?? 'Gagal menyimpan kategori.');
      }
    });
  }

  async deactivate(c: AduCategory) {
    const ya = await this.confirm.ask({
      title: 'Nyahaktifkan Kategori',
      message: `Nyahaktifkan kategori "${c.name}"?`,
      detail: c.used > 0
        ? `${c.used} aduan menggunakan kategori ini. Ia kekal pada aduan tersebut, `
          + 'tetapi tidak lagi boleh dipilih untuk aduan baharu.'
        : 'Kategori tidak lagi boleh dipilih untuk aduan baharu.',
      confirmText: 'Ya, nyahaktifkan'
    });
    if (!ya) return;

    this.api.deactivateCategory(c.id).subscribe({
      next: () => { this.toast.success('Kategori dinyahaktifkan.'); this.load(); },
      error: e => this.toast.error(e?.error?.message ?? 'Gagal menyahaktifkan.')
    });
  }
}
