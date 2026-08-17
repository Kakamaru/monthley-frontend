import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AccountsService, MyAccountRow, HistoryRow, HistoryResponse, OnlineOutstanding } from '../accounts/accounts.service';

@Component({
  selector: 'app-my-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="m-fade">
      <!-- ===== HASIL BAYARAN (selepas kembali dari gerbang) ===== -->
@if (payResult(); as pr) {
  <div class="pay-result" [class.bad]="!pr.ok">
    <div class="pay-result-ic">{{ pr.ok ? '✓' : '!' }}</div>
    <div class="pay-result-main">
      <div class="pay-result-title">
        {{ pr.ok ? 'Bayaran Diterima' : 'Bayaran Gagal' }}
        @if (pr.amount) { <span class="pay-result-amt">MYR {{ pr.amount | number:'1.2-2' }}</span> }
      </div>
      <div class="pay-result-msg">{{ pr.msg }}</div>
    </div>
    <button type="button" class="pay-result-x" (click)="tutupHasil()">&times;</button>
  </div>
}

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
              <p class="banner-sub">Anda mempunyai <b>RM {{ totalArrears() | number:'1.2-2' }}</b>
                 tunggakan merentasi {{ outstandingCount() }} akaun.</p>
            </div>
            <div class="banner-pay">
              <div class="banner-pay-lbl">Jumlah perlu dibayar</div>
              <button class="btn-payall" (click)="payAll()">Bayar Semua RM {{ totalToPay() | number:'1.0-0' }} →</button>
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
                  <!-- Baki dan Tunggakan ialah nombor BERBEZA. Baki boleh
                       negatif (kredit); tunggakan tidak. Legacy memaparkan
                       kedua-duanya bersebelahan tanpa membezakannya. -->
                  <div class="bal-lbl">Baki Semasa</div>
                  <!-- Negatif dipaparkan dengan tandanya (-500.00), hijau:
                       pengguna portal membacanya sebagai lebihan tanpa perlu
                       konvensyen kurungan perakaunan. Positif = tunggakan,
                       merah. -->
                  <div class="bal" [class.neg]="a.balance < 0">
                    MYR {{ a.balance | number:'1.2-2' }}
                  </div>
                  @if (a.arrears > 0 && a.arrears !== a.balance) {
                    <div class="latest">Tunggakan: <b>MYR {{ a.arrears | number:'1.2-2' }}</b></div>
                  }
                  <div class="latest">Invois terkini: <b>MYR {{ (a.latestInvoiceAmount ?? 0) | number:'1.2-2' }}</b></div>
                  <div class="due-row">
                    <span class="due-lbl">Tarikh akhir:</span>
                    <span class="due-chip" [class.overdue]="isOverdue(a.dueDate)">{{ a.dueDate ? (a.dueDate | date:'dd/MM/yyyy') : '—' }}</span>
                  </div>
                </div>
                <div class="card-foot">
                  <button class="foot-soft" [disabled]="stmtBusy() === a.id"
                          (click)="statement(a)">
                    {{ stmtBusy() === a.id ? 'Menjana…' : '📄 Penyata' }}
                  </button>
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
                <span>
                  <button class="dl-btn" title="Muat turun PDF"
                          [disabled]="docBusy() === h.id" (click)="muatTurun(h)">
                    {{ docBusy() === h.id ? '…' : '⬇' }}
                  </button>
                </span>
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
<!-- ===== BAYARAN DALAM TALIAN ===== -->
@if (payOpen()) {
  <!-- Klik latar TIDAK menutup: borang yang separuh diisi hilang kerana
       terklik di luar kotak. Tutup melalui X atau Escape sahaja. -->
  <div class="pay-ov">
    <div class="pay-modal">
      <div class="pay-head">
        <div>
          <div class="pay-title">Bayar Bil</div>
          <div class="pay-sub">{{ payAccount()?.accountNo }} — {{ payAccount()?.accountName }}</div>
        </div>
        <button type="button" class="pay-x" (click)="closePay()">×</button>
      </div>

      @if (payError()) { <div class="pay-err">{{ payError() }}</div> }

      @if (billsLoading()) {
        <div class="pay-empty">Memuatkan bil…</div>
      } @else if (!bills().length) {
        <div class="pay-empty">Tiada bil tertunggak. 🎉</div>
      } @else {
        <div class="pay-tools">
          <button type="button" class="pay-link" (click)="pickAll()">
            {{ picked().size === bills().length ? 'Nyahtanda semua' : 'Tanda semua' }}
          </button>
          <span class="pay-count">{{ picked().size }} / {{ bills().length }} dipilih</span>
        </div>

        <div class="pay-list">
          @for (b of bills(); track b.documentId) {
            <label class="pay-row" [class.on]="picked().has(b.documentId)">
              <input type="checkbox" [checked]="picked().has(b.documentId)"
                     (change)="togglePick(b.documentId)" />
              <div class="pay-row-main">
                <div class="pay-row-no">{{ b.docNo }}</div>
                <div class="pay-row-sub">
                  {{ b.period || '—' }}
                  @if (b.dueDate) {
                    · <span [class.pay-late]="b.overdue">
                        {{ b.dueDate | date:'dd/MM/yyyy' }}
                      </span>
                  }
                </div>
              </div>
              <div class="pay-row-amt">MYR {{ b.balance | number:'1.2-2' }}</div>
            </label>
          }
        </div>

        <div class="pay-amt-box">
          <label class="pay-amt-lbl">Amaun Bayaran (MYR)</label>
          <input class="pay-amt-inp" type="number" step="0.01" min="0.01"
                 [(ngModel)]="payAmount" (ngModelChange)="onAmountChange()" />
          <p class="pay-note">
            Jumlah bil dipilih: <b>MYR {{ pickedTotal() | number:'1.2-2' }}</b>.
            Bayar kurang untuk bayaran sebahagian, atau lebih — lebihan menjadi
            kredit untuk bil akan datang.
          </p>

          @if (fee(); as f) {
            <div class="pay-break">
              <div class="pay-break-row">
                <span>Bayaran bil</span>
                <span>MYR {{ f.amount | number:'1.2-2' }}</span>
              </div>
              @if (!f.absorb && f.fee > 0) {
                <div class="pay-break-row">
                  <span>Caj transaksi</span>
                  <span>MYR {{ f.fee | number:'1.2-2' }}</span>
                </div>
              }
              <div class="pay-break-row total">
                <span>Jumlah dibayar</span>
                <span>MYR {{ f.charged | number:'1.2-2' }}</span>
              </div>
              @if (f.absorb && f.fee > 0) {
                <p class="pay-break-note">
                  Caj transaksi ditanggung oleh pihak pengurusan.
                </p>
              }
            </div>
          }
        </div>

        <div class="pay-foot">
          <button type="button" class="pay-cancel" (click)="closePay()">Batal</button>
          <button type="button" class="pay-go" [disabled]="payBusy()" (click)="submitPay()">
            {{ payBusy() ? 'Menghubungkan…'
                : 'Bayar MYR ' + ((fee()?.charged ?? payAmount) | number:'1.2-2') + ' →' }}
          </button>
        </div>
      }
    </div>
  </div>
}

  `,
  styles: [`
    /* ===== Sepanduk hasil bayaran ===== */
    .pay-result {
      display: flex; align-items: flex-start; gap: 14px;
      margin: 0 0 18px; padding: 16px 18px;
      background: #e7f6ec; border: 1.5px solid #b6e3c6; border-radius: 14px;
      animation: payPop .35s ease;
    }
    .pay-result.bad { background: #fdecec; border-color: #f3c9c9; }
    @keyframes payPop {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pay-result-ic {
      width: 34px; height: 34px; flex: none; border-radius: 50%;
      background: #16a34a; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 17px;
    }
    .pay-result.bad .pay-result-ic { background: #c2564c; }
    .pay-result-main { flex: 1; min-width: 0; }
    .pay-result-title {
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 15.5px;
      color: #122029; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .pay-result-amt { font-size: 15px; color: #16a34a; }
    .pay-result.bad .pay-result-amt { color: #c2564c; }
    .pay-result-msg { font-size: 13.5px; color: #3a4c53; margin-top: 3px; }
    .pay-result-x {
      border: none; background: transparent; font-size: 20px; line-height: 1;
      cursor: pointer; color: #6b7f86; flex: none;
    }

    /* ===== Modal bayaran dalam talian ===== */
    .pay-ov {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(9,20,26,.55);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .pay-modal {
      background: #fff; border-radius: 18px; width: 100%; max-width: 520px;
      max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 30px 70px rgba(9,20,26,.4);
    }
    .pay-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; padding: 20px 22px; border-bottom: 1px solid #eef2ef;
    }
    .pay-title { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 18px; color: #122029; }
    .pay-sub   { font-size: 13px; color: #6b7f86; margin-top: 2px; }
    .pay-x {
      border: none; background: #f1f5f2; width: 30px; height: 30px; border-radius: 9px;
      font-size: 17px; line-height: 1; cursor: pointer; color: #3a4c53; flex: none;
    }
    .pay-err {
      margin: 14px 22px 0; padding: 11px 13px; border-radius: 10px;
      background: #fdecec; color: #b0151e; font-size: 13.5px;
    }
    .pay-empty { padding: 40px 22px; text-align: center; color: #94a3a9; font-size: 14px; }
    .pay-tools {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 22px 8px;
    }
    .pay-link {
      border: none; background: none; padding: 0; cursor: pointer;
      font-size: 13.5px; font-weight: 700; color: #16a34a;
    }
    .pay-count { font-size: 12.5px; color: #94a3a9; }

    .pay-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 22px; }
    .pay-row {
      display: flex; align-items: center; gap: 12px; cursor: pointer;
      padding: 12px 13px; margin-bottom: 8px;
      border: 1.5px solid #e6ebe7; border-radius: 12px; background: #fff;
    }
    .pay-row.on { border-color: #16a34a; background: #f4fbf6; }
    .pay-row input { width: 17px; height: 17px; flex: none; accent-color: #16a34a; }
    .pay-row-main { flex: 1; min-width: 0; }
    .pay-row-no   { font-weight: 700; font-size: 14px; color: #122029; }
    .pay-row-sub  { font-size: 12px; color: #6b7f86; margin-top: 2px; }
    .pay-late     { color: #c2564c; font-weight: 700; }
    .pay-row-amt  {
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 14.5px;
      color: #122029; white-space: nowrap;
    }

    .pay-amt-box { padding: 14px 22px 4px; border-top: 1px solid #eef2ef; margin-top: 8px; }
    .pay-amt-lbl {
      display: block; font-size: 12.5px; font-weight: 700; color: #3a4c53;
      margin-bottom: 6px;
    }
    .pay-amt-inp {
      width: 100%; padding: 12px 14px; border: 1.5px solid #dbe3de; border-radius: 11px;
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 17px; color: #122029;
      box-sizing: border-box;
    }
    .pay-amt-inp:focus { outline: none; border-color: #16a34a; }
    .pay-note { font-size: 12px; color: #6b7f86; line-height: 1.55; margin: 8px 0 0; }

    .pay-break {
      margin: 12px 0 0; padding: 13px 15px; border-radius: 12px;
      background: #f4fbf6; border: 1px solid #d5e9db;
    }
    .pay-break-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13.5px; color: #3a4c53; padding: 3px 0;
    }
    .pay-break-row.total {
      margin-top: 8px; padding-top: 10px; border-top: 1px solid #d5e9db;
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 15px;
      color: #122029;
    }
    .pay-break-note {
      font-size: 12px; color: #16a34a; margin: 8px 0 0; font-weight: 600;
    }

    .pay-foot { display: flex; gap: 10px; padding: 16px 22px 20px; }
    .pay-cancel, .pay-go {
      flex: 1; padding: 13px; border-radius: 12px; cursor: pointer;
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14px;
    }
    .pay-cancel { background: #fff; color: #3a4c53; border: 1.5px solid #dbe3de; }
    .pay-go     { background: #16a34a; color: #fff; border: none; flex: 1.6; }
    .pay-go:disabled { opacity: .5; cursor: default; }

    @media (max-width: 560px) {
      .pay-ov { padding: 0; align-items: flex-end; }
      .pay-modal { max-width: none; border-radius: 18px 18px 0 0; max-height: 92vh; }
    }

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
        @media (max-width: 640px) {
      .card { flex: 0 0 85%; min-width: 85%; max-width: 85%; }
      .nav-btn { flex: 0 0 34px; width: 34px; height: 34px; font-size: 18px; }
      .carousel { gap: 6px; }
    }
.nav-btn { flex: 0 0 44px; width: 44px; height: 44px; border-radius: 11px; border: 1.5px solid var(--line); background: var(--surface);
      color: var(--muted-3); font-size: 22px; font-weight: 700; cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center; }
    .btn-sub { background: #122029; color: #fff; border: none; font-family: 'Sora', sans-serif; font-weight: 700;
      font-size: 13px; padding: 10px 18px; border-radius: 10px; cursor: pointer; margin-left: 4px; }

    .scroller { flex: 1 1 auto; min-width: 0; display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 6px; }
    .card { flex: 1 1 0; min-width: 300px; max-width: 460px; scroll-snap-align: start; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
    .card-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--line-soft); }
    .card-org { display: flex; align-items: center; gap: 11px; }
    .logo { width: 42px; height: 42px; border-radius: 11px; color: #fff; display: flex; align-items: center; justify-content: center;
      font-family: 'Sora', sans-serif; font-weight: 800; font-size: 14px; }
    .org-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14px; color: var(--ink); }
    .org-no { font-size: 14px; color: var(--ink); font-weight: 700;
               letter-spacing: .02em; }
    .org-holder { font-size: 12px; color: #e0863b; font-weight: 700; margin-top: 1px; }
    .card-body { padding: 18px; }
    .bal-lbl { font-size: 12px; color: var(--muted); font-weight: 600; }
    .bal { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 28px; margin: 2px 0 12px; color: #c0392b; white-space: nowrap; }
    .bal.neg { color: #2e7d32; }
    .latest { font-size: 13px; color: var(--muted); }
    .latest b { color: var(--ink); }
    .due-row { display: flex; align-items: center; gap: 7px; margin-top: 10px; }
    .due-lbl { font-size: 12px; color: var(--muted); font-weight: 600; }
    .due-chip { background: #e9f7ef; color: #1b7a43; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 8px; }
    .due-chip.overdue { background: #fdecec; color: #c0392b; }
    .card-foot { display: flex; border-top: 1px solid var(--line-soft); }
    .foot-soft { flex: 1; background: var(--surface); border: none; border-right: 1px solid var(--line-soft); font-family: 'Sora', sans-serif;
      font-weight: 700; font-size: 13px; color: var(--muted-3); padding: 14px; cursor: pointer; }
    .foot-pay { flex: 1; background: var(--green); border: none; color: #fff; font-family: 'Sora', sans-serif; font-weight: 700; font-size: 13px; padding: 14px; cursor: pointer; }
    .hist-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 22px; margin-top: 20px; }
    .hist-head { display: flex; align-items: center; gap: 20px; border-bottom: 1px solid var(--line-soft); padding-bottom: 12px; margin-bottom: 12px; }
    .hist-head h3 { font-size: 18px; margin: 0; color: var(--ink); }
    .tab { background: var(--surface); border: 1.5px solid var(--line); color: var(--muted); font-family: 'Sora', sans-serif; font-weight: 700; font-size: 13px; padding: 8px 18px; border-radius: 9px; cursor: pointer; }
    .tab.active { background: var(--green-soft); color: var(--green-dark);
                 border-color: var(--green); font-weight: 800; }
    .hist-filter { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .fl-lbl { font-size: 12px; font-weight: 700; color: var(--muted); }
    .fl-date { padding: 9px 11px; border: 1.5px solid var(--line-input); border-radius: 9px; font-size: 13px; color: var(--muted-3); }
    .fl-search { flex: 1; min-width: 200px; padding: 9px 13px; border: 1.5px solid var(--line-input); border-radius: 9px; font-size: 13px; }
    .fl-btn { background: var(--green); color: #fff; border: none; font-family: 'Sora', sans-serif; font-weight: 700; font-size: 13px; padding: 9px 20px; border-radius: 9px; cursor: pointer; }
    .hist-grid { display: grid; grid-template-columns: 1fr 0.8fr 1.4fr 0.8fr 1.2fr 1fr 50px; gap: 8px; align-items: center; }
    .hist-hd { padding: 11px 4px; font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
    .hist-row { padding: 13px 4px; font-size: 14px; color: var(--ink);
                border-top: 1px solid var(--line-soft); }

    @media (max-width: 640px) {
      /* Sejarah: header sembunyi, baris jadi card menegak */
      .hist-hd { display: none; }
      .hist-row {
        display: flex; flex-direction: column; gap: 3px;
        padding: 14px 2px; border-top: 1px solid var(--line-soft);
      }
      .hist-row .c-amt { font-size: 17px; margin-top: 4px; }
      .hist-row .dl-btn { align-self: flex-start; margin-top: 6px; }
      .hist-filter { flex-direction: column; align-items: stretch; }
      .fl-search { min-width: 0; width: 100%; }
    }

    .c-mut { color: var(--muted-2); }
    .c-doc { font-weight: 700; color: var(--green); }
    .c-amt { font-family: 'Sora', sans-serif; font-weight: 700; white-space: nowrap; }
    .dl-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--green); color: #fff; cursor: pointer; }
    .hist-empty { padding: 30px; text-align: center; color: var(--muted); }
    .hist-pager { display: flex; align-items: center; justify-content: space-between; padding: 14px 4px 2px; border-top: 1px solid var(--line-soft); margin-top: 6px; font-size: 13px; }
    .pager-btns { display: flex; gap: 6px; }
    .pg { width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--surface); color: var(--muted-3); font-size: 15px; cursor: pointer; }
    .pg:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class MyAccountsComponent implements OnInit {
  readonly auth = inject(AuthService);
  private api = inject(AccountsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly rows = signal<MyAccountRow[]>([]);
  readonly loading = signal(false);

  readonly spCount = computed(() => new Set(this.rows().map(r => r.spCode)).size);
  // Tunggakan dikira di BACKEND dan dihantar sebagai medan sendiri.
  // Math.max(0, balance) di sini menduplikasi peraturan yang sudah hidup
  // dalam core/ui/balance.ts dan dalam SQL — tiga tempat untuk satu
  // takrifan (guard 6). Kredit pada satu akaun tidak mengurangkan hutang
  // pada akaun lain, jadi jumlahkan arrears, bukan balance.
  /**
   * DUA nombor, dua tujuan — jangan campur.
   *
   * totalArrears  = invois belum berbayar. Untuk ayat "anda mempunyai X
   *                 tunggakan".
   * totalToPay    = jumlah yang perlu dijelaskan SELEPAS kredit belum
   *                 dipadankan ditolak. Untuk butang Bayar.
   *
   * M04 (27 Julai 2026): tunggakan 700.59 tetapi baki 500.59 — RM200
   * sudah dibayar, cuma belum dialokasi. Butang yang menggunakan arrears
   * akan meminta RM200 yang bukan hak kita (CASE-005 semula).
   *
   * Kredit pada satu akaun TIDAK mengurangkan hutang pada akaun lain,
   * jadi max(0, ...) dikenakan per akaun sebelum dijumlahkan.
   */
  readonly totalArrears = computed(() =>
    this.rows().reduce((s, r) => s + (r.arrears ?? 0), 0));
  readonly totalToPay = computed(() =>
    this.rows().reduce((s, r) => s + Math.max(0, r.balance), 0));
  readonly outstandingCount = computed(() => this.rows().filter(r => (r.arrears ?? 0) > 0).length);

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
    this.semakBayaran();
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

  private readonly palette = ['var(--green)','#dc2626','#2563eb','#d97706','#7c3aed','#0891b2'];
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
  readonly stmtBusy = signal<number | null>(null);

  /**
   * Muat turun penyata PDF akaun sendiri.
   *
   * Interceptor menyisipkan Authorization, jadi ini tidak boleh menjadi
   * <a href> biasa. Backend menyemak payer_user_id dan mengembalikan 404
   * (bukan 403) untuk akaun orang lain, supaya ID tidak boleh dibilang.
   */
  statement(a: MyAccountRow) {
    this.stmtBusy.set(a.id);
    this.api.myStatementPdf(a.id, new Date().getFullYear()).subscribe({
      next: res => {
        const blob = res.body;
        if (!blob) { this.stmtBusy.set(null); return; }
        const cd = res.headers.get('Content-Disposition') ?? '';
        const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
        const nama = m ? decodeURIComponent(m[1])
          : `penyata-${a.accountNo}-${new Date().getFullYear()}.pdf`;

        const url = URL.createObjectURL(blob);
        const el = document.createElement('a');
        el.href = url; el.download = nama;
        document.body.appendChild(el); el.click();
        document.body.removeChild(el);
        URL.revokeObjectURL(url);
        this.stmtBusy.set(null);
      },
      error: () => this.stmtBusy.set(null)
    });
  }
  readonly docBusy = signal<number | null>(null);

  /**
   * Muat turun resit atau invois.
   *
   * Interceptor menyisipkan Authorization, jadi ini tidak boleh menjadi
   * <a href> biasa — sama seperti penyata. Backend menyemak pemilikan
   * melalui payer_user_id dan mengembalikan 404 untuk dokumen orang lain,
   * supaya ID tidak boleh dibilang.
   */
  muatTurun(h: HistoryRow) {
    this.docBusy.set(h.id);
    this.api.myDocumentPdf(h.docType, h.id).subscribe({
      next: res => {
        const blob = res.body;
        if (!blob) { this.docBusy.set(null); return; }

        const cd = res.headers.get('Content-Disposition') ?? '';
        const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
        const nama = m ? decodeURIComponent(m[1]) : `${h.docNo}.pdf`;

        const url = URL.createObjectURL(blob);
        const el = document.createElement('a');
        el.href = url; el.download = nama;
        document.body.appendChild(el); el.click();
        document.body.removeChild(el);
        URL.revokeObjectURL(url);
        this.docBusy.set(null);
      },
      error: () => this.docBusy.set(null)
    });
  }

  // ---------- Kembali dari gerbang ----------

  /**
   * Hasil bayaran selepas pelanggan kembali.
   *
   * Tanpa ini, pelanggan mendarat di skrin yang kelihatan sama seperti
   * sebelum membayar — resit ada dalam sejarah di bawah, tetapi mereka
   * perlu menatal untuk mencarinya. Pelanggan yang tidak pasti akan
   * membayar sekali lagi.
   *
   * Status datang daripada BACKEND, bukan daripada parameter URL: apa-apa
   * dalam URL boleh ditaip semula oleh sesiapa.
   */
  readonly payResult = signal<{ ok: boolean; msg: string; amount?: number } | null>(null);

  private semakBayaran() {
    // Dibaca daripada window.location, bukan ActivatedRoute.snapshot.
    // Komponen dimuatkan secara lazy melalui laluan bersarang, dan
    // snapshot pada peringkat itu belum tentu membawa query param
    // induk — ia kosong, dan semakan keluar senyap.
    const ref = new URLSearchParams(window.location.search).get('bayar');
    if (!ref) return;

    this.api.onlinePaymentStatus(ref).subscribe({
      next: st => {
        if (st.status === 'SUCCESS') {
          this.payResult.set({
            ok: true,
            msg: 'Bayaran berjaya diterima. Resit telah dijana.',
            amount: st.paidAmount ?? st.amount
          });
          // Muat semula akaun SAHAJA — memanggil ngOnInit() di sini
          // ialah gelung, kerana ngOnInit memanggil semakBayaran().
          this.api.myAccounts().subscribe({
            next: r => this.rows.set(r),
            error: () => { /* baki kekal lama; sepanduk sudah dipapar */ }
          });
        } else if (st.status === 'FAILED') {
          this.payResult.set({ ok: false, msg: 'Bayaran tidak berjaya. Sila cuba lagi.' });
        } else {
          // PENDING bermakna callback belum tiba. Ia biasanya tiba dalam
          // satu saat, tetapi pelanggan boleh kembali lebih pantas.
          this.payResult.set({
            ok: true,
            msg: 'Bayaran sedang diproses. Resit akan muncul sebentar lagi.'
          });
          setTimeout(() => this.semakBayaran(), 4000);
        }
      },
      error: () => { /* rujukan tidak dikenali — abaikan senyap */ }
    });
  }

  tutupHasil() {
    this.payResult.set(null);
    this.router.navigate([], { queryParams: {} });
  }

  // ---------- Bayaran dalam talian ----------

  readonly payOpen = signal(false);
  readonly payAccount = signal<MyAccountRow | null>(null);
  readonly bills = signal<OnlineOutstanding[]>([]);
  readonly billsLoading = signal(false);
  readonly payBusy = signal(false);
  readonly payError = signal<string | null>(null);

  /** documentId yang ditanda. */
  readonly picked = signal<Set<number>>(new Set());

  /**
   * Amaun yang pelanggan hendak bayar.
   *
   * Lalai kepada jumlah bil yang ditanda, tetapi boleh diubah — kurang
   * untuk bayaran separa, lebih untuk membayar awal (lebihan menjadi
   * advance dan di-knock pada bil seterusnya).
   */
  payAmount = 0;

  /**
   * Pecahan caj transaksi.
   *
   * Dikira oleh BACKEND, bukan di sini: kadar dan tetapan serap hidup
   * pada tetapan SP, dan menyalin logiknya ke skrin bermakna dua tempat
   * mengira nombor yang sama — dan menyimpang selepas suntingan pertama.
   */
  readonly fee = signal<{ amount: number; fee: number; charged: number;
                          absorb: boolean } | null>(null);

  private feeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Pratonton dinyahlantun 400ms.
   *
   * Pelanggan menaip amaun aksara demi aksara; satu permintaan setiap
   * ketukan membanjiri pelayan untuk nilai separa yang tidak pernah
   * dihantar.
   */
  private mintaPratonton() {
    const a = this.payAccount();
    const ids = [...this.picked()];
    const amt = Number(this.payAmount);

    if (!a || !ids.length || !amt || amt <= 0) { this.fee.set(null); return; }

    if (this.feeTimer) clearTimeout(this.feeTimer);
    this.feeTimer = setTimeout(() => {
      this.api.previewFee(a.id, ids, amt).subscribe({
        next: f => this.fee.set(f),
        error: () => this.fee.set(null)
      });
    }, 400);
  }

  /** Dipanggil bila pelanggan menaip amaun. */
  onAmountChange() { this.mintaPratonton(); }

  readonly pickedTotal = computed(() =>
    this.bills()
        .filter(b => this.picked().has(b.documentId))
        .reduce((t, b) => t + b.balance, 0));

  pay(a: MyAccountRow) {
    this.payAccount.set(a);
    this.bills.set([]);
    this.picked.set(new Set());
    this.payAmount = 0;
    this.fee.set(null);
    this.payError.set(null);
    this.payOpen.set(true);
    this.billsLoading.set(true);

    this.api.onlineOutstanding(a.id).subscribe({
      next: b => {
        this.bills.set(b);
        // Semua ditanda secara lalai — kes biasa ialah membayar segalanya,
        // dan menyahtanda lebih mudah daripada menanda satu per satu.
        this.picked.set(new Set(b.map(x => x.documentId)));
        this.payAmount = b.reduce((t, x) => t + x.balance, 0);
        this.billsLoading.set(false);
        this.mintaPratonton();
      },
      error: e => {
        this.payError.set(e?.error?.message ?? 'Gagal memuatkan bil.');
        this.billsLoading.set(false);
      }
    });
  }

  closePay() { this.payOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscapePay() { if (this.payOpen()) this.closePay(); }

  togglePick(id: number) {
    const set = new Set(this.picked());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.picked.set(set);
    this.payAmount = this.pickedTotal();
    this.mintaPratonton();
  }

  pickAll() {
    const semua = this.picked().size === this.bills().length;
    this.picked.set(semua ? new Set() : new Set(this.bills().map(b => b.documentId)));
    this.payAmount = this.pickedTotal();
    this.mintaPratonton();
  }

  /**
   * Hantar ke gerbang.
   *
   * Resit TIDAK dicipta di sini — ia dicipta oleh callback server-ke-server,
   * yang tiba walaupun pelanggan menutup tab selepas membayar.
   */
  submitPay() {
    const a = this.payAccount();
    if (!a) return;

    const ids = [...this.picked()];
    if (!ids.length) { this.payError.set('Pilih sekurang-kurangnya satu bil.'); return; }

    const amt = Number(this.payAmount);
    if (!amt || amt <= 0) { this.payError.set('Masukkan amaun bayaran.'); return; }

    this.payBusy.set(true);
    this.payError.set(null);

    this.api.startOnlinePayment(a.id, ids, amt).subscribe({
      next: r => {
        try { sessionStorage.setItem('monthley.pay.ref', r.ourRef); } catch { /* abaikan */ }
        window.location.href = r.paymentUrl;
      },
      error: e => {
        this.payBusy.set(false);
        this.payError.set(e?.error?.message ?? 'Gagal memulakan bayaran.');
      }
    });
  }
  payAll() { /* TODO: FPX bayar semua */ }
  subscribe() { /* TODO: modal langgan akaun */ }
}
