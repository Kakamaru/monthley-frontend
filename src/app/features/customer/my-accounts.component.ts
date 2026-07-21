import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { AccountsService, MyAccountRow, HistoryRow, HistoryResponse } from '../accounts/accounts.service';

@Component({
  selector: 'app-my-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="m-fade">
      @if (!auth.hasAccounts()) {
        <div class="empty-card" data-card>
          <div class="empty-ic">📭</div>
          <h3>Belum ada akaun dipautkan</h3>
          <p>Akaun anda belum dipautkan dengan mana-mana organisasi.
             Hubungi organisasi anda dan berikan e-mel ini:</p>
          <div class="email-chip">{{ auth.session()?.email }}</div>
          <p class="hint">Setelah dipautkan, bil &amp; sejarah bayaran anda akan muncul di sini.</p>
        </div>
      } @else {
        <!-- Banner tunggakan -->
        <div class="banner">
          <div class="banner-glow"></div>
          <div class="banner-row">
            <div>
              <div class="banner-chip">● {{ rows().length }} akaun aktif · {{ spCount() }} Service Provider</div>
              <h1 class="banner-h1">Assalamualaikum, {{ auth.displayName() }} 👋</h1>
              <p class="banner-sub">Anda mempunyai <b>RM {{ totalOutstanding() | number:'1.2-2' }}</b>
                 tunggakan merentasi {{ outstandingCount() }} akaun.</p>
            </div>
            <div class="banner-pay">
              <div class="banner-pay-lbl">Jumlah perlu dibayar</div>
              <button class="btn-payall" (click)="payAll()">Bayar Semua RM {{ totalOutstanding() | number:'1.0-0' }} →</button>
            </div>
          </div>
        </div>

        @if (loading()) {
          <div class="empty-card" data-card><p>Memuatkan akaun anda…</p></div>
        } @else {
          <div class="carousel">
            <button class="nav-btn" (click)="scroll(-1)">‹</button>
            <div class="scroller" #scroller>
            @for (a of rows(); track a.id) {
              <div class="card" data-card>
                <div class="card-top">
                  <div class="card-org">
                    <div class="logo" [style.background]="logoBg(a)">{{ initials(a.spName) }}</div>
                    <div>
                      <div class="org-name">{{ a.spName }}</div>
                      <div class="org-no">{{ a.accountNo }}</div>
                      <div class="org-holder">{{ a.accountName }}</div>
                    </div>
                  </div>
                </div>
                <div class="card-body">
                  <div class="bal-lbl">Baki Semasa</div>
                  <div class="bal" [class.neg]="a.balance < 0">
                    @if (a.balance < 0) { (MYR {{ (-a.balance) | number:'1.2-2' }}) }
                    @else { MYR {{ a.balance | number:'1.2-2' }} }
                  </div>
                  <div class="latest">Invois terkini: <b>MYR {{ (a.latestInvoiceAmount ?? 0) | number:'1.2-2' }}</b></div>
                  <div class="due-row">
                    <span class="due-lbl">Tarikh akhir:</span>
                    <span class="due-chip" [class.overdue]="isOverdue(a.dueDate)">{{ a.dueDate ? (a.dueDate | date:'dd/MM/yyyy') : '—' }}</span>
                  </div>
                </div>
                <div class="card-foot">
                  <button class="foot-soft" (click)="statement(a)">📄 Penyata</button>
                  <button class="foot-pay" (click)="pay(a)">Bayar Sekarang</button>
                </div>
              </div>
            }
              @if (rows().length === 0) {
                <div class="empty-card" data-card><p>Tiada akaun aktif.</p></div>
              }
            </div>
            <button class="nav-btn" (click)="scroll(1)">›</button>
          </div>
        }

        <!-- Sejarah -->
        <div class="hist-card" data-card>
          <div class="hist-head">
            <h3>Sejarah</h3>
            <button class="tab" [class.active]="histType() === 'RECEIPT'" (click)="setType('RECEIPT')">Resit</button>
            <button class="tab" [class.active]="histType() === 'INVOICE'" (click)="setType('INVOICE')">Invois</button>
          </div>
          <div class="hist-filter">
            <span class="fl-lbl">Dari</span>
            <input type="date" [(ngModel)]="fFrom" class="fl-date">
            <span class="fl-lbl">Hingga</span>
            <input type="date" [(ngModel)]="fTo" class="fl-date">
            <input placeholder="Cari pengeluar / no. dokumen..." [(ngModel)]="fQ" class="fl-search">
            <button class="fl-btn" (click)="searchHist()">Cari</button>
          </div>
          <div class="hist-grid hist-hd">
            <span>Tarikh</span><span>Jenis</span><span>Pengeluar</span><span>Akaun</span>
            <span>No. {{ histType() === 'RECEIPT' ? 'Resit' : 'Invois' }}</span><span>Amaun</span><span></span>
          </div>
          @if (histLoading()) {
            <div class="hist-empty">Memuatkan…</div>
          } @else {
            @for (h of hist()?.items ?? []; track h.docNo) {
              <div class="hist-grid hist-row">
                <span class="c-mut">{{ h.date | date:'dd/MM/yyyy' }}</span>
                <span>{{ h.docType === 'RECEIPT' ? 'Resit' : 'Invois' }}</span>
                <span class="c-mut">{{ h.spName }}</span>
                <span class="c-mut">{{ h.accountNo }}</span>
                <span class="c-doc">{{ h.docNo }}</span>
                <span class="c-amt">MYR {{ h.amount | number:'1.2-2' }}</span>
                <span><button class="dl-btn" title="Muat turun">⬇</button></span>
              </div>
            }
            @if ((hist()?.items?.length ?? 0) === 0) {
              <div class="hist-empty">Tiada rekod.</div>
            }
            <div class="hist-pager">
              <span class="c-mut">{{ pagerLabel() }}</span>
              <div class="pager-btns">
                <button class="pg" [disabled]="histPage() === 0" (click)="goPage(histPage() - 1)">‹</button>
                <button class="pg" [disabled]="!hasNext()" (click)="goPage(histPage() + 1)">›</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .empty-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px;
      padding: 56px 40px; text-align: center; max-width: 560px; margin: 24px auto 0; }
    .empty-ic { font-size: 44px; margin-bottom: 16px; }
    h3 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 20px; margin: 0 0 10px; }
    .empty-card p { color: var(--muted); font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .email-chip { display: inline-block; background: var(--green-soft); color: var(--green-dark);
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 15px; padding: 10px 20px; border-radius: 999px; margin-bottom: 16px; }
    .hint { font-size: 13px; margin: 0; }

    .banner { position: relative; overflow: hidden; background: linear-gradient(120deg,#122029,#1b3a2f);
      border-radius: 18px; padding: 20px 26px; color: #eaf1ee; margin-bottom: 12px; }
    .banner-glow { position: absolute; top: -90px; right: -40px; width: 360px; height: 360px;
      background: radial-gradient(circle, rgba(188,214,52,0.2), transparent 62%); pointer-events: none; }
    .banner-row { position: relative; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; }
    .banner-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14); padding: 6px 13px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #bcd634; white-space: nowrap; }
    .banner-h1 { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 26px; margin: 8px 0 3px; }
    .banner-sub { color: #a9bcc4; margin: 0; font-size: 15px; }
    .banner-sub b { color: #f0a35f; }
    .banner-pay { text-align: right; }
    .banner-pay-lbl { font-size: 12px; color: #a9bcc4; font-weight: 600; margin-bottom: 8px; }
    .btn-payall { background: linear-gradient(120deg,#bcd634,#3fae52); color: #0f2116; border: none;
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 15px; padding: 14px 26px; border-radius: 12px; cursor: pointer; }

    .carousel { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
    .nav-btn { flex: 0 0 44px; width: 44px; height: 44px; border-radius: 11px; border: 1.5px solid #e6ebe7; background: #fff;
      color: #3a4c53; font-size: 22px; font-weight: 700; cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center; }
    .btn-sub { background: #122029; color: #fff; border: none; font-family: 'Sora', sans-serif; font-weight: 700;
      font-size: 13px; padding: 10px 18px; border-radius: 10px; cursor: pointer; margin-left: 4px; }

    .scroller { flex: 1; min-width: 0; display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 6px; }
    .card { flex: 0 0 330px; scroll-snap-align: start; background: #fff; border: 1px solid #e6ebe7; border-radius: 18px; overflow: hidden; }
    .card-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #f0f3f0; }
    .card-org { display: flex; align-items: center; gap: 11px; }
    .logo { width: 42px; height: 42px; border-radius: 11px; color: #fff; display: flex; align-items: center; justify-content: center;
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 14px; }
    .org-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14px; }
    .org-no { font-size: 11px; color: #6b7f86; }
    .org-holder { font-size: 12px; color: #e0863b; font-weight: 700; margin-top: 1px; }
    .card-body { padding: 18px; }
    .bal-lbl { font-size: 12px; color: #6b7f86; font-weight: 600; }
    .bal { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 28px; margin: 2px 0 12px; color: #c0392b; white-space: nowrap; }
    .bal.neg { color: #2e7d32; }
    .latest { font-size: 13px; color: #6b7f86; }
    .latest b { color: #16262f; }
    .due-row { display: flex; align-items: center; gap: 7px; margin-top: 10px; }
    .due-lbl { font-size: 12px; color: #6b7f86; font-weight: 600; }
    .due-chip { background: #e9f7ef; color: #1b7a43; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 8px; }
    .due-chip.overdue { background: #fdecec; color: #c0392b; }
    .card-foot { display: flex; border-top: 1px solid #f0f3f0; }
    .foot-soft { flex: 1; background: #fff; border: none; border-right: 1px solid #f0f3f0; font-family: 'Sora', sans-serif;
      font-weight: 700; font-size: 13px; color: #3a4c53; padding: 14px; cursor: pointer; }
    .foot-pay { flex: 1; background: #16a34a; border: none; color: #fff; font-family: 'Sora', sans-serif; font-weight: 700; font-size: 13px; padding: 14px; cursor: pointer; }
    .hist-card { background: #fff; border: 1px solid #e6ebe7; border-radius: 18px; padding: 22px; margin-top: 20px; }
    .hist-head { display: flex; align-items: center; gap: 20px; border-bottom: 1px solid #f0f3f0; padding-bottom: 12px; margin-bottom: 12px; }
    .hist-head h3 { font-size: 18px; margin: 0; }
    .tab { background: #fff; border: 1.5px solid #e6ebe7; color: #6b7f86; font-family: 'Sora', sans-serif; font-weight: 700; font-size: 13px; padding: 8px 18px; border-radius: 9px; cursor: pointer; }
    .tab.active { background: #122029; color: #fff; border-color: #122029; }
    .hist-filter { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .fl-lbl { font-size: 12px; font-weight: 700; color: #6b7f86; }
    .fl-date { padding: 9px 11px; border: 1.5px solid #dbe3de; border-radius: 9px; font-size: 13px; color: #3a4c53; }
    .fl-search { flex: 1; min-width: 200px; padding: 9px 13px; border: 1.5px solid #dbe3de; border-radius: 9px; font-size: 13px; }
    .fl-btn { background: #16a34a; color: #fff; border: none; font-family: 'Sora', sans-serif; font-weight: 700; font-size: 13px; padding: 9px 20px; border-radius: 9px; cursor: pointer; }
    .hist-grid { display: grid; grid-template-columns: 1fr 0.8fr 1.4fr 0.8fr 1.2fr 1fr 50px; gap: 8px; align-items: center; }
    .hist-hd { padding: 11px 4px; font-size: 12px; font-weight: 700; color: #6b7f86; text-transform: uppercase; letter-spacing: .03em; }
    .hist-row { padding: 13px 4px; font-size: 14px; border-top: 1px solid #f0f3f0; }
    .c-mut { color: #4a5d64; }
    .c-doc { font-weight: 700; color: #16a34a; }
    .c-amt { font-family: 'Sora', sans-serif; font-weight: 700; white-space: nowrap; }
    .dl-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #16a34a; color: #fff; cursor: pointer; }
    .hist-empty { padding: 30px; text-align: center; color: #6b7f86; }
    .hist-pager { display: flex; align-items: center; justify-content: space-between; padding: 14px 4px 2px; border-top: 1px solid #f0f3f0; margin-top: 6px; font-size: 13px; }
    .pager-btns { display: flex; gap: 6px; }
    .pg { width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid #e6ebe7; background: #fff; color: #3a4c53; font-size: 15px; cursor: pointer; }
    .pg:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class MyAccountsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private api = inject(AccountsService);

  readonly rows = signal<MyAccountRow[]>([]);
  readonly loading = signal(false);

  readonly spCount = computed(() => new Set(this.rows().map(r => r.spCode)).size);
  readonly totalOutstanding = computed(() =>
    this.rows().reduce((s, r) => s + Math.max(0, r.balance), 0));
  readonly outstandingCount = computed(() => this.rows().filter(r => r.balance > 0).length);

  // Sejarah state
  readonly histType = signal<'RECEIPT' | 'INVOICE'>('RECEIPT');
  readonly hist = signal<HistoryResponse | null>(null);
  readonly histLoading = signal(false);
  readonly histPage = signal(0);
  readonly histSize = 10;
  fFrom = ''; fTo = ''; fQ = '';

  readonly hasNext = computed(() => {
    const h = this.hist();
    return h ? (h.page + 1) * this.histSize < h.total : false;
  });
  readonly pagerLabel = computed(() => {
    const h = this.hist();
    if (!h || h.total === 0) return '0 rekod';
    const from = h.page * this.histSize + 1;
    const to = Math.min((h.page + 1) * this.histSize, h.total);
    return `${from}–${to} daripada ${h.total}`;
  });

  ngOnInit() {
    if (!this.auth.hasAccounts()) return;
    this.loading.set(true);
    this.api.myAccounts().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.loadHist();
  }

  loadHist() {
    this.histLoading.set(true);
    this.api.myHistory({
      type: this.histType(), from: this.fFrom || undefined, to: this.fTo || undefined,
      q: this.fQ || undefined, page: this.histPage(), size: this.histSize
    }).subscribe({
      next: r => { this.hist.set(r); this.histLoading.set(false); },
      error: () => this.histLoading.set(false)
    });
  }
  setType(t: 'RECEIPT' | 'INVOICE') { this.histType.set(t); this.histPage.set(0); this.loadHist(); }
  searchHist() { this.histPage.set(0); this.loadHist(); }
  goPage(p: number) { this.histPage.set(p); this.loadHist(); }

  private readonly palette = ['#16a34a','#dc2626','#2563eb','#d97706','#7c3aed','#0891b2'];
  logoBg(a: MyAccountRow): string {
    let h = 0; for (const c of a.spCode) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return this.palette[h % this.palette.length];
  }
  initials(name: string): string {
    return (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
  isOverdue(due: string | null): boolean {
    return !!due && new Date(due) < new Date();
  }

  scroll(dir: number) {
    const el = document.querySelector('.scroller') as HTMLElement | null;
    if (el) el.scrollBy({ left: dir * 350, behavior: 'smooth' });
  }
  statement(a: MyAccountRow) { /* TODO: modal penyata pelanggan */ }
  pay(a: MyAccountRow) { /* TODO: FPX bayar akaun */ }
  payAll() { /* TODO: FPX bayar semua */ }
  subscribe() { /* TODO: modal langgan akaun */ }
}
