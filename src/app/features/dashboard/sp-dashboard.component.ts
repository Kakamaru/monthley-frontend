import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary, ChartPoint } from './dashboard.service';
import { SpContextService } from '../../core/services/sp-context.service';

@Component({
  selector: 'app-sp-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="dash">

    <div class="banner">
      <div class="banner-glow"></div>
      <div class="banner-row">
        <div class="banner-main">
          <span class="chip">● Fasa Automasi · {{ monthLabel() }}</span>
          <h1>Selamat kembali, {{ sp.spName() }} 👋</h1>
          <p>Kutipan berjalan lancar bulan ini.</p>
        </div>
        <div class="banner-actions">
          <a routerLink="/portal/invoicing" class="b-btn b-primary">🧾 Jana Bil</a>
          <a routerLink="/portal/reports" class="b-btn b-ghost">📈 Laporan</a>
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-top">
          <div class="stat-ic" style="background:#e7f6ec">💰</div>
          <span class="stat-badge" style="color:#128a41;background:#e7f6ec">Bulan ini</span>
        </div>
        <div class="stat-lbl">Terkumpul ({{ monthShort() }})</div>
        <div class="stat-val">RM {{ (s()?.collectedThisMonth ?? 0) | number:'1.2-2' }}</div>
      </div>

      <div class="stat">
        <div class="stat-top">
          <div class="stat-ic" style="background:#fdf1e6">⏰</div>
          <span class="stat-badge" style="color:#c26a1f;background:#fdf1e6">Perlu tindakan</span>
        </div>
        <div class="stat-lbl">Tunggakan</div>
        <div class="stat-val" style="color:#e0863b">RM {{ (s()?.outstanding ?? 0) | number:'1.2-2' }}</div>
      </div>

      <div class="stat">
        <div class="stat-top">
          <div class="stat-ic" style="background:#e8eefb">👥</div>
          <span class="stat-badge" style="color:#6b7f86;background:#eef2ef">{{ s()?.inactiveAccounts ?? 0 }} tak aktif</span>
        </div>
        <div class="stat-lbl">Akaun Aktif</div>
        <div class="stat-val">{{ s()?.activeAccounts ?? 0 }}</div>
      </div>

      <div class="stat">
        <div class="stat-top">
          <div class="stat-ic" style="background:#f2ecfb">🧾</div>
          <span class="stat-badge" style="color:#128a41;background:#e7f6ec">Auto</span>
        </div>
        <div class="stat-lbl">Bil Dijana ({{ monthShort() }})</div>
        <div class="stat-val">{{ s()?.billsThisMonth ?? 0 }}</div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-head">
        <div>
          <h3>Kutipan Bulanan</h3>
          <span class="chart-sub">RM</span>
        </div>
        <div class="seg">
          <button [class.on]="months() === 6" (click)="setMonths(6)">6 Bulan</button>
          <button [class.on]="months() === 12" (click)="setMonths(12)">12 Bulan</button>
        </div>
      </div>

      @if (chartLoading()) {
        <div class="chart-empty">Memuatkan…</div>
      } @else if (chart().length === 0) {
        <div class="chart-empty">Tiada data kutipan.</div>
      } @else {
        <div class="bars">
          @for (b of chart(); track b.month) {
            <div class="bar-col">
              <div class="bar-val">{{ b.amount | number:'1.0-0' }}</div>
              <div class="bar" [style.height.%]="barHeight(b.amount)"></div>
              <div class="bar-m">{{ monthName(b.month) }}</div>
            </div>
          }
        </div>
      }
    </div>

  </div>
  `,
  styles: [`
    .dash { display: flex; flex-direction: column; gap: 16px; }
    .banner { position: relative; overflow: hidden; border-radius: 20px;
      background: linear-gradient(120deg, #122029, #1b3a2f); color: #eaf1ee; padding: 30px 34px; }
    .banner-glow { position: absolute; top: -80px; right: -40px; width: 320px; height: 320px;
      background: radial-gradient(circle, rgba(188,214,52,.18), transparent 70%); pointer-events: none; }
    .banner-row { position: relative; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; }
    .chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.14); padding: 6px 13px; border-radius: 999px;
      font-size: 12px; font-weight: 700; color: #bcd634; }
    .banner-main h1 { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 30px; margin: 14px 0 4px; }
    .banner-main p { color: #a9bcc4; margin: 0; font-size: 15px; }
    .banner-actions { display: flex; gap: 12px; }
    .b-btn { padding: 12px 20px; border-radius: 12px; font-weight: 700; font-size: 14px;
      text-decoration: none; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
    .b-primary { background: linear-gradient(120deg, #bcd634, #3fae52); color: #0f2116; }
    .b-ghost { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); color: #eaf1ee; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .stat { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 20px; }
    .stat-top { display: flex; align-items: center; justify-content: space-between; }
    .stat-ic { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 21px; }
    .stat-badge { font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 999px; }
    .stat-lbl { font-size: 13px; color: var(--muted); font-weight: 600; margin-top: 16px; }
    .stat-val { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 26px; margin-top: 2px; color: var(--ink); }
    .chart-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 24px 26px; }
    .chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .chart-head h3 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 17px; margin: 0; color: var(--ink); }
    .chart-sub { font-size: 12px; color: var(--muted); font-weight: 600; }
    .seg { display: flex; gap: 6px; background: var(--surface-alt); padding: 4px; border-radius: 10px; }
    .seg button { border: none; background: transparent; padding: 7px 14px; border-radius: 7px;
      font-weight: 700; font-size: 13px; color: var(--muted); cursor: pointer; }
    .seg button.on { background: var(--ink); color: var(--surface); }
    .bars { display: flex; align-items: flex-end; gap: 12px; height: 200px; padding-top: 10px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
    .bar-val { font-size: 11px; font-weight: 700; color: var(--ink); }
    .bar { width: 100%; border-radius: 7px 7px 0 0; background: linear-gradient(180deg, #bcd634, #16a34a); min-height: 4px;
      transition: height .4s cubic-bezier(.2,.8,.3,1); }
    .bar-m { font-size: 11px; color: var(--muted); font-weight: 600; }
    .chart-empty { padding: 60px; text-align: center; color: var(--muted); }
    @media (max-width: 900px) {
      .banner { padding: 22px 20px; }
      .banner-main h1 { font-size: 23px; }
      .stats { grid-template-columns: 1fr 1fr; }
      .banner-actions { width: 100%; }
      .b-btn { flex: 1; justify-content: center; }
    }
    @media (max-width: 560px) {
      .stats { grid-template-columns: 1fr; }
      .bars { gap: 6px; }
    }
  `]
})
export class SpDashboardComponent implements OnInit {
  private api = inject(DashboardService);
  readonly sp = inject(SpContextService);

  readonly s = signal<DashboardSummary | null>(null);
  readonly chart = signal<ChartPoint[]>([]);
  readonly chartLoading = signal(true);
  readonly months = signal<6 | 12>(6);

  private readonly maxAmount = computed(() =>
    Math.max(1, ...this.chart().map(c => c.amount)));

  ngOnInit() {
    this.api.summary().subscribe({ next: r => this.s.set(r) });
    this.loadChart();
  }

  setMonths(m: 6 | 12) {
    if (this.months() === m) return;
    this.months.set(m);
    this.loadChart();
  }

  private loadChart() {
    this.chartLoading.set(true);
    this.api.collectionChart(this.months()).subscribe({
      next: r => { this.chart.set(r); this.chartLoading.set(false); },
      error: () => { this.chart.set([]); this.chartLoading.set(false); }
    });
  }

  barHeight(amount: number): number {
    return Math.round((amount / this.maxAmount()) * 100);
  }

  monthName(ym: string): string {
    const names = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    const m = parseInt(ym.split('-')[1], 10);
    return names[m - 1] ?? ym;
  }

  monthLabel(): string {
    const names = ['Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];
    const d = new Date();
    return `${names[d.getMonth()]} ${d.getFullYear()}`;
  }

  monthShort(): string {
    const names = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    return names[new Date().getMonth()];
  }
}
