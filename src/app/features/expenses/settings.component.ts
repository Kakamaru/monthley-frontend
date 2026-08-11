import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpNoticeComponent } from './module-notice.component';
import { ModuleService } from '../../core/services/module.service';
import { ExpensesService, ExpSetting, ExpPaymentMethod, GlOption } from './expenses.service';

@Component({
  selector: 'app-exp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpNoticeComponent],
  templateUrl: './settings.component.html',
  styleUrl: './expenses.scss'
})
export class ExpSettingsComponent {
  private api = inject(ExpensesService);
  readonly modules = inject(ModuleService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);

  readonly banks = signal<GlOption[]>([]);
  readonly methods = signal<ExpPaymentMethod[]>([]);

  // Maklumat & SST
  sstEnabled = false;
  sstRate = 0;
  pvPrefix = 'PV';
  pvNoSize = 6;
  cashPrefix = 'BT';
  cashNoSize = 6;
  bankGlAccountId: number | null = null;

  // Modal kaedah
  readonly methodOpen = signal(false);
  readonly editingMethod = signal<ExpPaymentMethod | null>(null);
  methodName = '';
  methodActive = true;

  private current: ExpSetting | null = null;

  constructor() {
    this.load();
    this.api.bankAccounts().subscribe({ next: b => this.banks.set(b), error: () => {} });
    this.loadMethods();
  }

  load() {
    this.loading.set(true);
    this.api.settings().subscribe({
      next: s => {
        this.current = s;
        this.sstEnabled = s.sstEnabled;
        this.sstRate = s.sstRate;
        this.pvPrefix = s.pvPrefix;
        this.pvNoSize = s.pvNoSize;
        this.cashPrefix = s.cashPrefix;
        this.cashNoSize = s.cashNoSize;
        this.bankGlAccountId = s.bankGlAccountId;
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan tetapan.');
        this.loading.set(false);
      }
    });
  }

  loadMethods() {
    this.api.methods().subscribe({
      next: m => this.methods.set(m),
      error: () => this.methods.set([])
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.error.set(null);
    this.ok.set(null);

    const body: ExpSetting = {
      sstEnabled: this.sstEnabled,
      sstRate: Number(this.sstRate) || 0,
      pvPrefix: this.pvPrefix.trim() || 'PV',
      pvNoSize: Number(this.pvNoSize) || 6,
      pvNoStart: this.current?.pvNoStart ?? 1,
      cashPrefix: this.cashPrefix.trim() || 'BT',
      cashNoSize: Number(this.cashNoSize) || 6,
      cashNoStart: this.current?.cashNoStart ?? 1,
      bankGlAccountId: this.bankGlAccountId
    };

    this.api.saveSettings(body).subscribe({
      next: s => {
        this.current = s;
        this.saving.set(false);
        this.ok.set('Tetapan disimpan.');
        setTimeout(() => this.ok.set(null), 3000);
      },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal menyimpan tetapan.');
        this.saving.set(false);
      }
    });
  }

  // ---------- Kaedah bayaran ----------

  newMethod() {
    this.editingMethod.set(null);
    this.methodName = ''; this.methodActive = true;
    this.error.set(null); this.methodOpen.set(true);
  }

  editMethod(m: ExpPaymentMethod) {
    this.editingMethod.set(m);
    this.methodName = m.name; this.methodActive = m.active;
    this.error.set(null); this.methodOpen.set(true);
  }

  closeMethod() { this.methodOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.methodOpen()) this.closeMethod(); }

  saveMethod() {
    if (!this.methodName.trim()) { this.error.set('Nama kaedah wajib diisi.'); return; }
    this.saving.set(true);
    this.error.set(null);

    this.api.saveMethod(
      { name: this.methodName.trim(), active: this.methodActive },
      this.editingMethod()?.id
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.methodOpen.set(false);
        this.loadMethods();
      },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal menyimpan kaedah.');
        this.saving.set(false);
      }
    });
  }

  deactivateMethod(m: ExpPaymentMethod) {
    if (!confirm(`Nyahaktifkan kaedah "${m.name}"?`)) return;
    this.api.deactivateMethod(m.id).subscribe({
      next: () => this.loadMethods(),
      error: e => this.error.set(e?.error?.message ?? 'Gagal menyahaktifkan.')
    });
  }
}
