import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SpListService, SpRow, SpSummary } from './sp-list.service';
import { OnboardService, ServicePlan, BusinessType } from './onboard.service';

@Component({
  selector: 'app-service-providers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './service-providers.component.html'
})
export class ServiceProvidersComponent {
  private api = inject(SpListService);
  private ref = inject(OnboardService);

  readonly cols = '0.8fr 1.9fr 1.1fr 1.2fr 1fr 0.9fr 110px';

  readonly rows = signal<SpRow[]>([]);
  readonly summary = signal<SpSummary | null>(null);
  readonly bizTypes = signal<BusinessType[]>([]);
  readonly plans = signal<ServicePlan[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchOpen = signal(true);

  fQ = '';
  fBizType = '';
  fStatus = '';
  fPlan: number | null = null;
  fState = '';

  readonly negeri = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
    'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
    'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'
  ];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => {
    const t = this.total();
    const from = t ? this.page() * this.size() + 1 : 0;
    const to = Math.min(this.page() * this.size() + this.size(), t);
    return `Menunjukkan ${from}–${to} daripada ${t}`;
  });

  constructor() {
    this.ref.businessTypes().subscribe({ next: b => this.bizTypes.set(b), error: () => {} });
    this.ref.plans().subscribe({ next: p => this.plans.set(p), error: () => {} });
    this.api.summary().subscribe({ next: s => this.summary.set(s), error: () => {} });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({
      q: this.fQ || null, bizType: this.fBizType || null,
      status: this.fStatus || null, plan: this.fPlan, state: this.fState || null,
      page: this.page(), size: this.size()
    }).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.error.set('Gagal memuatkan senarai SP.');
        this.loading.set(false);
        console.error(e);
      }
    });
  }

  search() { this.page.set(0); this.load(); }

  clear() {
    this.fQ = ''; this.fBizType = ''; this.fStatus = ''; this.fPlan = null; this.fState = '';
    this.page.set(0);
    this.load();
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

  statusColor(s: string): string {
    switch (s) {
      case 'ACTIVE':    return 'var(--green)';
      case 'PENDING':   return 'var(--orange)';
      case 'SUSPENDED': return 'var(--red)';
      default:          return 'var(--muted)';
    }
  }

  statusBg(s: string): string {
    switch (s) {
      case 'ACTIVE':    return 'var(--green-soft)';
      case 'PENDING':   return 'rgba(224,134,59,.12)';
      case 'SUSPENDED': return 'rgba(214,69,69,.12)';
      default:          return 'var(--surface-alt)';
    }
  }

  /** Peratus penggunaan had akaun — amaran bila hampir penuh. */
  usage(r: SpRow): number {
    if (!r.accountLimit) return 0;
    return Math.round((r.accountCount / r.accountLimit) * 100);
  }

  usageColor(r: SpRow): string {
    const u = this.usage(r);
    if (u >= 90) return 'var(--red)';
    if (u >= 75) return 'var(--orange)';
    return 'var(--green)';
  }
}
