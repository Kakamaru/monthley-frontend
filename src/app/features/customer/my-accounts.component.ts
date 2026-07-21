import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { AccountsService, MyAccountRow } from '../accounts/accounts.service';

@Component({
  selector: 'app-my-accounts',
  standalone: true,
  imports: [CommonModule],
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

  ngOnInit() {
    if (!this.auth.hasAccounts()) return;
    this.loading.set(true);
    this.api.myAccounts().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

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
