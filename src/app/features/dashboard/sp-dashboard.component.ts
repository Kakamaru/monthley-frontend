import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardSummary, ChartPoint, MainProduct, RecentTxn, ArrearRow } from './dashboard.service';
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

    <!-- Row: Carta (atas) sudah. Sekarang Produk Utama + row bawah -->
    <div class="lower">
      <!-- Produk Utama (kad gelap) -->
      <div class="prod-card">
        <div class="prod-tag">Produk Utama</div>
        @if (product()?.name) {
          <h3 class="prod-name">{{ product()?.name }}</h3>
          <p class="prod-sub">RM{{ product()?.rate | number:'1.0-2' }} / bulan · {{ freqLabel(product()?.frequency ?? null) }}</p>
          <div class="prod-bar-wrap">
            <div class="prod-bar-lbl"><span>Kadar kutipan {{ monthShort() }}</span><span>{{ product()?.collectionRate }}%</span></div>
            <div class="prod-track"><div class="prod-fill" [style.width.%]="product()?.collectionRate"></div></div>
          </div>
          <div class="prod-stats">
            <div class="prod-stat"><div class="ps-lbl">Dibayar</div><div class="ps-val">{{ product()?.paid }}</div></div>
            <div class="prod-stat"><div class="ps-lbl">Tertunggak</div><div class="ps-val" style="color:#f0a35f">{{ product()?.unpaid }}</div></div>
          </div>
        } @else {
          <p class="prod-empty">Tiada produk utama ditetapkan.</p>
        }
      </div>
    </div>

    <!-- Row bawah: Transaksi Terkini + Tunggakan Perlu Tindakan -->
    <div class="feeds">
      <div class="feed">
        <div class="feed-head">
          <h3>Transaksi Terkini</h3>
          <a routerLink="/portal/finance" class="feed-link">Lihat semua</a>
        </div>
        @if (txns().length === 0) {
          <div class="feed-empty">Tiada transaksi.</div>
        } @else {
          @for (t of txns(); track $index) {
            <div class="feed-row">
              <div class="feed-ava" style="background:#e7f6ec;color:#128a41">{{ initials(t.name) }}</div>
              <div class="feed-main">
                <div class="feed-name">{{ t.name }}</div>
                <div class="feed-desc">{{ t.accountNo }} · {{ t.date }}</div>
              </div>
              <div class="feed-amt" style="color:#128a41">RM {{ t.amount | number:'1.2-2' }}</div>
            </div>
          }
        }
      </div>

      <div class="feed">
        <div class="feed-head">
          <h3>Tunggakan Perlu Tindakan</h3>
          <a routerLink="/portal/reports" class="feed-link">Laporan</a>
        </div>
        @if (arrears().length === 0) {
          <div class="feed-empty">Tiada tunggakan. 🎉</div>
        } @else {
          @for (ar of arrears(); track $index) {
            <div class="feed-row">
              <div class="feed-ava" style="background:#fdf1e6;color:#c26a1f">{{ initials(ar.name) }}</div>
              <div class="feed-main">
                <div class="feed-name">{{ ar.name }}</div>
                <div class="feed-desc">{{ ar.accountNo }}</div>
              </div>
              <div class="feed-amt-wrap">
                <div class="feed-amt" style="color:#e0863b">RM {{ ar.outstanding | number:'1.2-2' }}</div>
                <div class="feed-amt-sub">tertunggak</div>
              </div>
            </div>
          }
        }
      </div>
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
    /* Produk Utama (kad gelap) */
    .lower { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .prod-card { background: linear-gradient(160deg, #122029, #1c3540); border-radius: 16px; padding: 22px; color: #eaf1ee; }
    .prod-tag { font-size: 12px; font-weight: 700; letter-spacing: .05em; color: #bcd634; text-transform: uppercase; }
    .prod-name { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 20px; margin: 8px 0 2px; }
    .prod-sub { font-size: 13px; color: #a9bcc4; margin: 0; }
    .prod-bar-wrap { margin: 20px 0 10px; }
    .prod-bar-lbl { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .prod-track { height: 10px; background: rgba(255,255,255,.12); border-radius: 99px; overflow: hidden; }
    .prod-fill { height: 100%; background: linear-gradient(90deg, #bcd634, #16a34a); transition: width .5s ease; }
    .prod-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
    .prod-stat { background: rgba(255,255,255,.06); border-radius: 12px; padding: 13px; }
    .ps-lbl { font-size: 11px; color: #a9bcc4; font-weight: 600; }
    .ps-val { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 18px; }
    .prod-empty { color: #a9bcc4; font-size: 14px; margin: 16px 0 0; }

    /* Feeds (transaksi + tunggakan) */
    .feeds { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .feed { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 22px; }
    .feed-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .feed-head h3 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 17px; margin: 0; color: var(--ink); }
    .feed-link { font-size: 13px; font-weight: 700; color: var(--brand, #16a34a); text-decoration: none; }
    .feed-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--line-soft); }
    .feed-row:first-of-type { border-top: none; }
    .feed-ava { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 13px; flex: none; }
    .feed-main { flex: 1; min-width: 0; }
    .feed-name { font-weight: 700; font-size: 14px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .feed-desc { font-size: 12px; color: var(--muted); }
    .feed-amt { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14px; }
    .feed-amt-wrap { text-align: right; }
    .feed-amt-sub { font-size: 11px; color: var(--muted); font-weight: 600; }
    .feed-empty { padding: 30px; text-align: center; color: var(--muted); font-size: 14px; }

    @media (max-width: 900px) {
      .banner { padding: 22px 20px; }
      .banner-main h1 { font-size: 23px; }
      .stats { grid-template-columns: 1fr 1fr; }
      .banner-actions { width: 100%; }
      .b-btn { flex: 1; justify-content: center; }
      .feeds { grid-template-columns: 1fr; }
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
  readonly product = signal<MainProduct | null>(null);
  readonly txns = signal<RecentTxn[]>([]);
  readonly arrears = signal<ArrearRow[]>([]);

  private readonly maxAmount = computed(() =>
    Math.max(1, ...this.chart().map(c => c.amount)));

  ngOnInit() {
    this.api.summary().subscribe({ next: r => this.s.set(r) });
    this.loadChart();
    this.api.mainProduct().subscribe({ next: r => this.product.set(r) });
    this.api.recentTransactions().subscribe({ next: r => this.txns.set(r) });
    this.api.topArrears().subscribe({ next: r => this.arrears.set(r) });
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

  initials(name: string): string {
    return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  freqLabel(f: string | null): string {
    const map: Record<string, string> = { MONTHLY: 'Bulanan', YEAR: 'Tahunan',
      QUARTERLY: 'Suku Tahun', HALF_YEAR: 'Setengah Tahun', ONE_TIME: 'Sekali', PER_USE: 'Per Guna' };
    return f ? (map[f] ?? f) : '';
  }

  monthShort(): string {
    const names = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    return names[new Date().getMonth()];
  }
}
