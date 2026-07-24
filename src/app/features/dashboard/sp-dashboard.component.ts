import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SpContextService } from '../../core/services/sp-context.service';
import {
  DashboardService, DashboardSummary, InvVsCol, ProductSlice,
  RecentTxn, ArrearRow
} from './dashboard.service';

@Component({
  selector: 'app-sp-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="dash">

    <!-- Kepala -->
    <div class="head">
      <div>
        <span class="chip">● Fasa Automasi · {{ monthLabel() }}</span>
        <h1>Selamat kembali, Pentadbir 👋</h1>
        <p class="sub">{{ sp.spName() }} · kutipan bulan ini</p>
      </div>
      <div class="head-actions">
        <a routerLink="/portal/invoicing" class="b-btn b-primary">🧾 Jana Bil</a>
        <a routerLink="/portal/reports" class="b-btn b-ghost">📈 Laporan</a>
      </div>
    </div>

    <!-- Baris 1 -->
    <div class="row-top">

      <!-- Terkumpul (kad gelap) -->
      <div class="cash">
        <div class="cash-top">
          <div class="cash-lbl"><span class="cash-ic">💰</span> Terkumpul · {{ monthShort() }}</div>
          @if (s(); as d) {
            <span class="mom" [class.neg]="d.momChange < 0">
              {{ d.momChange >= 0 ? '▲' : '▼' }} {{ abs(d.momChange) }}%
            </span>
          }
        </div>
        <div class="cash-val">RM {{ (s()?.collectedThisMonth ?? 0) | number:'1.2-2' }}</div>
        <div class="cash-bar-lbl">
          <span>Sasaran RM {{ (s()?.target ?? 0) | number:'1.0-0' }}</span>
          <span class="cash-pct">{{ s()?.collectionRate ?? 0 }}%</span>
        </div>
        <svg class="flow" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path d="M8 44 C 120 10, 250 52, 392 16" fill="none"
                stroke="#bcd634" stroke-width="2" stroke-linecap="round" />
        </svg>
        <div class="cash-track">
          <div class="cash-fill" [style.width.%]="capPct(s()?.collectionRate ?? 0)"></div>
        </div>
      </div>

      <!-- Donut kadar bayar -->
      <div class="card donut-card">
        <div class="donut-pos">
          <span class="dashring"></span>
          <div class="donut" [style.background]="payGradient()">
            <div class="donut-hole">
              <div class="donut-val" [style.color]="ring().color">{{ ring().pct }}%</div>
              <div class="donut-lbl">{{ ring().label }}</div>
            </div>
          </div>
        </div>
        <div class="donut-foot">{{ ring().sub }}</div>
        <div class="dots">
          @for (r of rings(); track $index) {
            <button class="dot" [class.on]="ringIdx() % 3 === $index"
                    (click)="ringIdx.set($index)" [title]="r.label"></button>
          }
        </div>
      </div>

      <!-- Dua kad kecil -->
      <div class="mini-col">
        <div class="card mini">
          <div class="mini-ic" style="background:#fdf1e6">⏰</div>
          <div>
            <div class="mini-lbl">Tunggakan</div>
            <div class="mini-val warn">RM {{ (s()?.outstanding ?? 0) | number:'1.2-2' }}</div>
            <div class="mini-sub">{{ s()?.arrearsAccounts ?? 0 }} akaun</div>
          </div>
        </div>
        <div class="card mini">
          <div class="mini-ic" style="background:#e8eefb">👥</div>
          <div>
            <div class="mini-lbl">Akaun Aktif</div>
            <div class="mini-val">{{ s()?.activeAccounts ?? 0 }}</div>
            <div class="mini-sub">{{ s()?.inactiveAccounts ?? 0 }} tak aktif</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Baris 2 -->
    <div class="row-mid">

      <!-- Invois vs Kutipan -->
      <div class="card">
        <div class="c-head">
          <div>
            <h3>Invois vs Kutipan</h3>
            <span class="c-sub">RM</span>
          </div>
          <div class="seg">
            <button [class.on]="months() === 6" (click)="setMonths(6)">6 Bulan</button>
            <button [class.on]="months() === 12" (click)="setMonths(12)">12 Bulan</button>
          </div>
        </div>

        <div class="legend">
          <span class="lg"><i style="background:#cbd5c0"></i>Invois</span>
          <span class="lg"><i style="background:linear-gradient(#3fae52,#16a34a)"></i>Kutipan (semua)</span>
          <span class="lg"><i style="background:linear-gradient(#5aa9e6,#2a6fdb)"></i>Kutipan invois bulan ini</span>
        </div>

        @if (chart().length === 0) {
          <div class="empty">Tiada data.</div>
        } @else {
          <div class="bars">
            @for (b of chart(); track b.month) {
              <div class="bcol">
                <div class="btrio">
                  <div class="bar b-inv" [style.height.%]="h(b.invoiced)"></div>
                  <div class="bar b-col" [style.height.%]="h(b.collected)"></div>
                  <div class="bar b-own" [style.height.%]="h(b.collectedOwn)"></div>
                  <span class="tip">
                    <em>{{ monthName(b.month) }}</em>
                    <span><i class="d-inv"></i>Invois<b>RM {{ b.invoiced | number:'1.2-2' }}</b></span>
                    <span><i class="d-col"></i>Kutipan<b>RM {{ b.collected | number:'1.2-2' }}</b></span>
                    <span><i class="d-own"></i>Invois bulan ini<b>RM {{ b.collectedOwn | number:'1.2-2' }}</b></span>
                  </span>
                </div>
                <div class="bm">{{ monthName(b.month) }}</div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Kutipan Ikut Produk -->
      <div class="card">
        <h3>Kutipan Ikut Produk</h3>
        <p class="c-sub2">{{ monthLabel() }} · RM {{ productTotal() | number:'1.2-2' }}</p>

        @if (products().length === 0) {
          <div class="empty">Tiada kutipan bulan ini.</div>
        } @else {
          <div class="donut-wrap">
            <div class="donut-pos">
            <span class="dashring rev"></span>
            <span class="coin">💰</span>
            <div class="donut sm" [style.background]="productGradient()">
              <div class="donut-hole sm">
                <div class="donut-lbl">Jumlah</div>
                <div class="donut-val sm">RM {{ productTotal() | number:'1.0-0' }}</div>
              </div>
            </div>
            </div>
          </div>
          <div class="plist">
            @for (p of products(); track p.name; let i = $index) {
              <div class="prow">
                <span class="pdot" [style.background]="sliceColor(i)"></span>
                <span class="pname">{{ p.name }}</span>
                <span class="ppct">{{ p.pct }}%</span>
                <span class="pamt">RM {{ p.amount | number:'1.2-2' }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Baris bawah -->
    <div class="feeds">
      <div class="card feed">
        <div class="c-head"><h3>Transaksi Terkini</h3>
          <a routerLink="/portal/finance" class="link">Lihat semua</a></div>
        @if (txns().length === 0) {
          <div class="empty">Tiada transaksi.</div>
        } @else {
          @for (t of txns(); track $index) {
            <div class="frow">
              <div class="fava" style="background:#e7f6ec;color:#128a41">{{ initials(t.name) }}</div>
              <div class="fmain">
                <div class="fname">{{ t.name }}</div>
                <div class="fsub">{{ t.accountNo }} · {{ t.date }}</div>
              </div>
              <div class="famt ok">RM {{ t.amount | number:'1.2-2' }}</div>
            </div>
          }
        }
      </div>

      <div class="card feed">
        <div class="c-head"><h3>Tunggakan Perlu Tindakan</h3>
          <a routerLink="/portal/reports" class="link">Laporan</a></div>
        @if (arrears().length === 0) {
          <div class="empty">Tiada tunggakan. 🎉</div>
        } @else {
          @for (a of arrears(); track $index) {
            <div class="frow">
              <div class="fava" style="background:#fdf1e6;color:#c26a1f">{{ initials(a.name) }}</div>
              <div class="fmain">
                <div class="fname">{{ a.name }}</div>
                <div class="fsub">{{ a.accountNo }}</div>
              </div>
              <div class="fright">
                <div class="famt warn">RM {{ a.outstanding | number:'1.2-2' }}</div>
                <div class="fsub">tertunggak</div>
              </div>
            </div>
          }
        }
      </div>
    </div>

  </div>
  `,
  styles: [`
    :host {
      --donut-track: #e6ebe7;
      --donut-hole: #fff;
      --seg-on-bg: #16262f;
      --seg-on-ink: #fff;
    }
    :host-context([data-theme='dark']) {
      --donut-track: rgba(255,255,255,.10);
      --donut-hole: #16242c;
      --seg-on-bg: #eaf1ee;
      --seg-on-ink: #16262f;
    }

    .dash { display: flex; flex-direction: column; gap: 14px; }

    /* Kepala */
    .head { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
    .chip { display: inline-flex; align-items: center; gap: 8px; background: #e7f6ec;
      border: 1px solid #cfe8d6; padding: 6px 13px; border-radius: 999px;
      font-size: 12px; font-weight: 700; color: #128a41; }
    .head h1 { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 28px;
      margin: 12px 0 4px; color: var(--ink); }
    .sub { color: var(--muted); margin: 0; font-size: 14px; }
    .head-actions { display: flex; gap: 10px; }
    .b-btn { padding: 11px 18px; border-radius: 11px; font-weight: 700; font-size: 14px;
      text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .b-primary { background: #16a34a; color: #fff; }
    .b-ghost { background: var(--surface); border: 1px solid var(--line); color: var(--ink); }

    .card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 22px; }

    /* Baris 1 */
    .row-top { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 14px; }

    .cash { position: relative; overflow: hidden;
      background: linear-gradient(150deg, #12241c, #1d3a2a); border-radius: 20px;
      padding: 22px; color: #eaf1ee; display: flex; flex-direction: column; }
    .cash-top { display: flex; align-items: center; justify-content: space-between; }
    .cash-lbl { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; }
    .cash-ic { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,.08);
      display: inline-flex; align-items: center; justify-content: center; font-size: 16px; }
    .mom { background: #bcd634; color: #16262f; font-size: 12px; font-weight: 800;
      padding: 5px 11px; border-radius: 999px; }
    .mom.neg { background: #f0a35f; }
    .cash-val { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 38px; margin: 18px 0 auto; }
    .cash-bar-lbl { display: flex; justify-content: space-between; font-size: 13px;
      color: #a9bcc4; margin: 16px 0 8px; }
    .cash-pct { color: #bcd634; font-weight: 800; }
    .cash-track { height: 9px; background: rgba(255,255,255,.12); border-radius: 99px; overflow: hidden; }
    .cash-fill { height: 100%; background: linear-gradient(90deg, #bcd634, #16a34a); transition: width .5s ease; }

    .donut-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }

    /* ── Animasi hiasan (CSS tulen, tiada library) ── */
    .donut-pos { position: relative; display: inline-flex; }

    .dashring { position: absolute; inset: -9px; border-radius: 50%;
      border: 2px dashed #bcd634; animation: m-spin 14s linear infinite; }
    .dashring.rev { inset: -8px; border-color: #3fae52;
      animation: m-spin 20s linear infinite reverse; }

    .coin { position: absolute; top: 50%; left: 50%; width: 26px; height: 26px;
      margin: -13px 0 0 -13px; border-radius: 50%; z-index: 2;
      background: linear-gradient(140deg, #f6e07a, #e0a92e);
      display: flex; align-items: center; justify-content: center; font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,.18);
      animation: m-orbit 12s linear infinite; }

    .flow { position: absolute; left: 0; right: 0; bottom: 44px;
      width: 100%; height: 60px; pointer-events: none; opacity: .5; }
    .flow path { stroke-dasharray: 7 9; animation: m-dash 22s linear infinite; }

    .dots { display: flex; gap: 6px; }
    .dot { width: 7px; height: 7px; padding: 0; border: none; border-radius: 99px;
      background: var(--line); cursor: pointer; transition: all .25s ease; }
    .dot.on { width: 20px; background: #16a34a; }

    .donut-val, .donut-lbl, .donut-foot { animation: m-fade .35s ease; }

    @keyframes m-spin { to { transform: rotate(360deg); } }
    @keyframes m-dash { to { stroke-dashoffset: -1000; } }
    @keyframes m-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes m-orbit {
      from { transform: rotate(0deg) translateX(83px) rotate(0deg); }
      to   { transform: rotate(360deg) translateX(83px) rotate(-360deg); }
    }

    /* Hormati tetapan pengguna yang matikan animasi */
    @media (prefers-reduced-motion: reduce) {
      .dashring, .coin, .flow path, .donut-val, .donut-lbl, .donut-foot { animation: none; }
    }
    .donut { position: relative; width: 150px; height: 150px; border-radius: 50%; }
    .donut.sm { width: 140px; height: 140px; }
    .donut-hole { position: absolute; inset: 26px; border-radius: 50%; background: var(--donut-hole);
      display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .donut-hole.sm { inset: 34px; }
    .donut-val { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 26px; color: #16a34a; }
    .donut-val.sm { font-size: 16px; color: var(--ink); }
    .donut-lbl { font-size: 11px; color: var(--muted); font-weight: 600; }
    .donut-foot { font-size: 13px; color: var(--muted); font-weight: 600; }

    .mini-col { display: flex; flex-direction: column; gap: 14px; }
    .mini { display: flex; align-items: center; gap: 14px; flex: 1; padding: 18px 20px; }
    .mini-ic { width: 44px; height: 44px; border-radius: 13px; flex: none;
      display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .mini-lbl { font-size: 13px; color: var(--muted); font-weight: 600; }
    .mini-val { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 21px; color: var(--ink); }
    .mini-sub { font-size: 11px; color: var(--muted); }
    .warn { color: #e0863b; }
    .ok { color: #128a41; }

    /* Baris 2 */
    .row-mid { display: grid; grid-template-columns: 1.9fr 1fr; gap: 14px; }
    .c-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .c-head h3, .card > h3 { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 17px;
      margin: 0; color: var(--ink); }
    .c-sub { font-size: 12px; color: var(--muted); font-weight: 600; }
    .c-sub2 { font-size: 12.5px; color: var(--muted); margin: 4px 0 16px; }
    .seg { display: flex; gap: 6px; background: var(--surface-alt); padding: 4px; border-radius: 10px; }
    .seg button { border: none; background: transparent; padding: 7px 14px; border-radius: 7px;
      font-weight: 700; font-size: 13px; color: var(--muted); cursor: pointer; }
    .seg button.on { background: var(--seg-on-bg); color: var(--seg-on-ink); }

    .legend { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
    .lg { display: flex; align-items: center; gap: 7px; font-size: 12.5px;
      color: var(--muted); font-weight: 600; }
    .lg i { width: 12px; height: 12px; border-radius: 3px; }

    .bars { display: flex; align-items: flex-end; gap: 12px; height: 196px;
      padding-top: 10px; overflow: visible; }
    .bcol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
      height: 100%; justify-content: flex-end; }
    .btrio { display: flex; align-items: flex-end; justify-content: center; gap: 4px;
      width: 100%; height: 100%; }
    .bar { width: 30%; border-radius: 5px 5px 0 0; min-height: 2px; transition: height .5s cubic-bezier(.2,.8,.3,1); }
    .btrio { position: relative; }
    .btrio:hover .bar { filter: brightness(1.08); }
    .tip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
      margin-bottom: 10px; background: #16262f; color: #eaf1ee; padding: 10px 13px;
      border-radius: 10px; font-size: 11.5px; font-weight: 600; white-space: nowrap;
      display: flex; flex-direction: column; gap: 5px;
      opacity: 0; pointer-events: none; transition: opacity .12s ease; z-index: 30;
      box-shadow: 0 8px 26px rgba(0,0,0,.28); }
    .tip em { font-style: normal; font-weight: 800; color: #a9bcc4; font-size: 11px;
      text-transform: uppercase; letter-spacing: .04em; }
    .tip span { display: flex; align-items: center; gap: 7px; }
    .tip i { width: 9px; height: 9px; border-radius: 2px; flex: none; }
    .tip .d-inv { background: #cbd5c0; }
    .tip .d-col { background: #16a34a; }
    .tip .d-own { background: #2a6fdb; }
    .tip b { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 12.5px;
      margin-left: auto; padding-left: 14px; }
    .tip::after { content: ''; position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%); border: 5px solid transparent; border-top-color: #16262f; }
    .btrio:hover .tip { opacity: 1; }
    .b-inv { background: #cbd5c0; }
    .b-col { background: linear-gradient(#3fae52, #16a34a); }
    .b-own { background: linear-gradient(#5aa9e6, #2a6fdb); }
    .bm { font-size: 11px; color: var(--muted); font-weight: 600; }

    .donut-wrap { display: flex; justify-content: center; margin-bottom: 18px; }
    .plist { display: flex; flex-direction: column; gap: 9px; }
    .prow { display: flex; align-items: center; gap: 9px; font-size: 13px; }
    .pdot { width: 10px; height: 10px; border-radius: 3px; flex: none; }
    .pname { flex: 1; color: var(--ink); font-weight: 600; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; }
    .ppct { color: var(--muted); font-weight: 700; }
    .pamt { color: #128a41; font-weight: 700; min-width: 84px; text-align: right; }

    /* Feeds */
    .feeds { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .link { font-size: 13px; font-weight: 700; color: #16a34a; text-decoration: none; }
    .frow { display: flex; align-items: center; gap: 12px; padding: 11px 0;
      border-top: 1px solid var(--line-soft); }
    .frow:first-of-type { border-top: none; }
    .fava { width: 40px; height: 40px; border-radius: 11px; flex: none;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 13px; }
    .fmain { flex: 1; min-width: 0; }
    .fname { font-weight: 700; font-size: 14px; color: var(--ink);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fsub { font-size: 12px; color: var(--muted); }
    .famt { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14px; }
    .fright { text-align: right; }
    .empty { padding: 40px; text-align: center; color: var(--muted); font-size: 14px; }

    @media (max-width: 1100px) {
      .row-top { grid-template-columns: 1fr 1fr; }
      .mini-col { grid-column: 1 / -1; flex-direction: row; }
      .row-mid { grid-template-columns: 1fr; }
    }
    @media (max-width: 760px) {
      .head h1 { font-size: 23px; }
      .head-actions { width: 100%; }
      .b-btn { flex: 1; justify-content: center; }
      .row-top, .feeds { grid-template-columns: 1fr; }
      .mini-col { flex-direction: column; }
      .cash-val { font-size: 30px; }
      .bars { gap: 6px; }
      .bar { width: 28%; }
    }
  `]
})
export class SpDashboardComponent implements OnInit, OnDestroy {
  private api = inject(DashboardService);
  readonly sp = inject(SpContextService);

  readonly s = signal<DashboardSummary | null>(null);
  readonly chart = signal<InvVsCol[]>([]);
  readonly products = signal<ProductSlice[]>([]);
  readonly txns = signal<RecentTxn[]>([]);
  readonly arrears = signal<ArrearRow[]>([]);
  readonly months = signal<6 | 12>(6);
  readonly ringIdx = signal(0);
  private ringTimer?: ReturnType<typeof setInterval>;

  /**
   * Tiga metrik donut, semuanya DITERBITKAN daripada data sedia ada —
   * tiada endpoint baharu. Bulan semasa = elemen terakhir carta.
   */
  readonly rings = computed(() => {
    const d = this.s();
    const now = this.chart().at(-1);
    const invoiced = now?.invoiced ?? 0;
    const own = now?.collectedOwn ?? 0;
    const arrearsPaid = now ? now.collected - now.collectedOwn : 0;
    const outstanding = d?.outstanding ?? 0;

    return [
      {
        pct: d && d.invoicedAccounts > 0
          ? Math.round((d.paidAccounts / d.invoicedAccounts) * 100) : 0,
        color: '#16a34a',
        label: 'kadar bayar',
        sub: `${d?.paidAccounts ?? 0} dibayar · ${d?.unpaidAccounts ?? 0} tertunggak`
      },
      {
        pct: outstanding > 0 ? Math.round((arrearsPaid / outstanding) * 100) : 0,
        color: '#e0863b',
        label: 'bayar tunggakan',
        sub: `RM ${this.rm(arrearsPaid)} dari RM ${this.rm(outstanding)} dikutip`
      },
      {
        pct: invoiced > 0 ? Math.round((own / invoiced) * 100) : 0,
        color: '#2a6fdb',
        label: 'invois bulan ini',
        sub: `RM ${this.rm(own)} dari RM ${this.rm(invoiced)} dikutip`
      }
    ];
  });

  readonly ring = computed(() => this.rings()[this.ringIdx() % 3]);

  private rm(v: number): string {
    return v.toLocaleString('en-MY', { maximumFractionDigits: 0 });
  }

  /** Skala carta — nilai tertinggi merentas ketiga-tiga siri. */
  private readonly chartMax = computed(() =>
    Math.max(1, ...this.chart().flatMap(b => [b.invoiced, b.collected, b.collectedOwn])));

  readonly productTotal = computed(() =>
    this.products().reduce((sum, p) => sum + p.amount, 0));

  private static readonly SLICE = ['#16a34a', '#3fae52', '#a3cc42', '#cfe08a', '#e3ecc4', '#f0f5e2'];

  ngOnInit() {
    this.api.summary().subscribe({ next: r => this.s.set(r) });
    this.api.collectionByProduct().subscribe({ next: r => this.products.set(r) });
    this.api.recentTransactions().subscribe({ next: r => this.txns.set(r) });
    this.api.topArrears().subscribe({ next: r => this.arrears.set(r) });
    this.loadChart();
    this.ringTimer = setInterval(() => this.ringIdx.update(i => (i + 1) % 3), 5000);
  }

  ngOnDestroy() {
    if (this.ringTimer) clearInterval(this.ringTimer);
  }

  setMonths(m: 6 | 12) {
    if (this.months() === m) return;
    this.months.set(m);
    this.loadChart();
  }

  private loadChart() {
    this.api.invoiceVsCollection(this.months()).subscribe({
      next: r => this.chart.set(r),
      error: () => this.chart.set([])
    });
  }

  /** Tinggi bar sebagai % daripada nilai tertinggi. */
  h(value: number): number {
    return Math.round((value / this.chartMax()) * 100);
  }

  abs(n: number): number { return Math.abs(n); }
  capPct(n: number): number { return Math.min(100, Math.max(0, n)); }

  /** Kadar bayar = akaun sudah bayar / akaun dikeluarkan invois. */
  payPct(): number {
    const d = this.s();
    if (!d || d.invoicedAccounts === 0) return 0;
    return Math.round((d.paidAccounts / d.invoicedAccounts) * 100);
  }

  payGradient(): string {
    const r = this.ring();
    return `conic-gradient(${r.color} 0% ${r.pct}%, var(--donut-track) ${r.pct}% 100%)`;
  }

  /** Donut produk — sempadan dikira terkumpul supaya tiada jurang. */
  productGradient(): string {
    const total = this.productTotal();
    if (total <= 0) return 'var(--donut-track)';
    let acc = 0;
    const stops = this.products().map((p, i) => {
      const from = (acc / total) * 100;
      acc += p.amount;
      const to = (acc / total) * 100;
      return `${this.sliceColor(i)} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  sliceColor(i: number): string {
    return SpDashboardComponent.SLICE[i % SpDashboardComponent.SLICE.length];
  }

  initials(name: string): string {
    return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  monthName(ym: string): string {
    const names = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    const m = parseInt(ym.split('-')[1], 10);
    return names[m - 1] ?? ym;
  }

  monthLabel(): string {
    const names = ['Januari','Februari','Mac','April','Mei','Jun','Julai',
                   'Ogos','September','Oktober','November','Disember'];
    const d = new Date();
    return `${names[d.getMonth()]} ${d.getFullYear()}`;
  }

  monthShort(): string {
    const names = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
    return names[new Date().getMonth()];
  }
}
