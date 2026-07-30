import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentRow, DocumentsService, LineRow, ProductLineRow } from './documents.service';
import { ProductsService } from '../products/products.service';
import { Product } from '../../core/models/product.model';
import { ToastService } from '../../core/ui/toast.service';

/**
 * Dokumen Kewangan — cari, papar dan hantar semula dokumen.
 *
 * SATU skrin untuk semua jenis: invois, resit, nota debit, nota kredit.
 * SP menggunakannya setiap hari untuk mencari dokumen dan mencetaknya
 * semula.
 *
 * Lajur 'Title' datang daripada tetapan SP ('Invois', 'RESIT'), bukan
 * document.title yang merupakan keterangan per-dokumen.
 *
 * PRODUK tidak dipaparkan — invois yang tidak dipecah mempunyai banyak
 * baris dan satu lajur tidak boleh mewakilinya. Butiran ada dalam modal
 * transaksi.
 *
 * Batal Dokumen DILUMPUHKAN: backend menanda dokumen tanpa membalikkan
 * alokasi (soalan terbuka 23). Menghidupkannya bermakna baki menyimpang
 * — bentuk yang sama dengan pepijat RM9.70 produksi.
 */
@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <h1 class="h1" style="margin:0 0 6px">Dokumen Kewangan</h1>
  <p style="color:var(--muted);margin:0 0 20px;font-size:15px">
    Cari, papar &amp; cetak semula semua transaksi akaun pelanggan.
  </p>

  <!-- ── carian ── -->
  <div style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:16px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <input class="fld" placeholder="No. Dokumen" [(ngModel)]="fDocNo" (keyup.enter)="cari()" />
      <input class="fld" placeholder="Akaun / Nama" [(ngModel)]="fAccount" (keyup.enter)="cari()" />
      <select class="fld" [(ngModel)]="fDocType">
        <option value="">Semua Jenis</option>
        <option value="INVOICE">Invois</option>
        <option value="RECEIPT">Resit</option>
        <option value="DEBIT_NOTE">Nota Debit</option>
        <option value="CREDIT_NOTE">Nota Kredit</option>
      </select>
    </div>

    @if (lanjutan()) {
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px">
        <!-- 'Aktif' pada invois tidak memberitahu apa-apa; SP bertanya
             bayaran mana yang belum masuk. -->
        <select class="fld" [(ngModel)]="fPayStatus" (change)="cari()">
          <option value="">Status Bayaran — Semua</option>
          <option value="UNPAID">Belum Bayar</option>
          <option value="PARTIAL">Bayar Sebahagian</option>
          <option value="PAID">Lunas</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
        <input class="fld" placeholder="Payment Ref No." [(ngModel)]="fPayRef" (keyup.enter)="cari()" />
        <!-- Memilih produk MENUKAR paparan ke peringkat baris. -->
        <!--
          (ngModelChange) dan bukan (change): pada <select> dengan
          [ngValue], (change) berjalan SEBELUM ngModel menetapkan nilai,
          jadi cari() melihat fProductId lama dan modBaris() kekal false —
          dropdown menunjukkan produk dipilih sementara jadual kekal mod
          dokumen.
        -->
        <select class="fld" [ngModel]="fProductId"
                (ngModelChange)="pilihProduk($event)">
          <option [ngValue]="null">Produk — Semua</option>
          @for (p of produk(); track p.id) {
            <option [ngValue]="p.id">{{ p.name }}</option>
          }
        </select>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">Dikeluarkan Dari</label>
          <input class="fld" type="date" [(ngModel)]="fFrom" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">Dikeluarkan Hingga</label>
          <input class="fld" type="date" [(ngModel)]="fTo" />
        </div>
      </div>
    }

    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
      <button class="btn btn-navy" (click)="cari()" [disabled]="loading()">Search</button>
      <button class="btn btn-ghost" (click)="kosongkan()">Clear</button>
      <button class="btn btn-ghost" style="width:42px;padding:0"
              [title]="lanjutan() ? 'Tutup kriteria' : 'Lagi kriteria'"
              (click)="lanjutan.set(!lanjutan())">{{ lanjutan() ? '⌃' : '⌄' }}</button>
    </div>
  </div>

  @if (ralat()) {
    <div style="background:var(--red-soft);border:1px solid var(--red);border-radius:10px;padding:12px 15px;font-size:13.5px;color:var(--red);margin-bottom:14px">
      {{ ralat() }}
    </div>
  }

  <!-- ── jadual dokumen (mod lalai) ── -->
  @if (!modBaris()) {
  <div style="background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden">
    <div [style.grid-template-columns]="cols"
         style="display:grid;gap:8px;padding:13px 18px;background:var(--surface-alt);font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">
      <span>No. Dokumen</span><span>Title</span><span>Akaun</span>
      <span>Issued To</span><span>Tarikh</span><span>Tempoh</span>
      <span style="text-align:center">Status</span>
      <span style="text-align:right">Amaun</span>
      <span style="text-align:center">Tindakan</span>
    </div>

    @if (loading()) {
      <div style="padding:28px;text-align:center;color:var(--muted)">Memuatkan…</div>
    } @else if (rows().length === 0) {
      <div style="padding:28px;text-align:center;color:var(--muted)">
        Tiada dokumen dijumpai.
      </div>
    } @else {
      @for (d of rows(); track d.id; let i = $index) {
        <div [style.grid-template-columns]="cols"
             style="display:grid;gap:8px;padding:14px 18px;border-top:1px solid var(--line-soft);align-items:center;font-size:13.5px"
             [style.opacity]="d.status === 'CANCELLED' ? '0.55' : '1'">
          <span style="color:var(--green);font-weight:700">{{ d.docNo }}</span>
          <span>{{ d.title }}</span>
          <span style="color:var(--muted-2)">{{ d.accountNo }}</span>
          <span>{{ d.issuedTo }}</span>
          <span style="color:var(--muted-2)">{{ d.docDate | date:'dd/MM/yyyy' }}</span>
          <span style="color:var(--muted-2)">{{ d.period }}</span>
          <span style="text-align:center">
            <span [style.background]="lencana(d).bg" [style.color]="lencana(d).fg"
                  style="font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap">
              {{ lencana(d).teks }}
            </span>
            @if (d.paymentStatus === 'PARTIAL') {
              <!-- 'Belum lunas' tidak cukup; SP perlu tahu berapa lagi. -->
              <div class="stmt-num" style="font-size:11px;color:var(--muted);margin-top:3px">
                baki {{ d.outstanding | number:'1.2-2' }}
              </div>
            }
          </span>
          <span class="stmt-num" style="text-align:right;font-weight:700;white-space:nowrap">
            MYR {{ d.amount | number:'1.2-2' }}
          </span>
          <span style="display:flex;gap:6px;justify-content:center;position:relative">
            <button class="act" data-tip="Papar Dokumen (PDF)"
                    [disabled]="pdfBusy() === d.id" (click)="paparPdf(d)">
              {{ pdfBusy() === d.id ? '…' : '👁' }}
            </button>
            <button class="act" data-tip="Papar Transaksi" (click)="bukaTransaksi(d)">💳</button>
            <button class="act" data-tip="Lagi" (click)="toggleMenu(d.id, $event)">⋯</button>

            @if (menuFor() === d.id) {
              <div class="pop-card more-menu"
                   [style.top]="i >= rows().length - 2 ? 'auto' : 'calc(100% + 4px)'"
                   [style.bottom]="i >= rows().length - 2 ? 'calc(100% + 4px)' : 'auto'"
                   style="position:absolute;right:0;z-index:60;border:1px solid var(--line-soft);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.2);min-width:200px;overflow:hidden"
                   (click)="$event.stopPropagation()">
                <button class="more-item" [disabled]="d.status === 'CANCELLED'"
                        [style.opacity]="d.status === 'CANCELLED' ? '.45' : '1'"
                        (click)="bukaBatal(d)">Cancel Document</button>
                <button class="more-item" [disabled]="d.status === 'CANCELLED'"
                        [style.opacity]="d.status === 'CANCELLED' ? '.45' : '1'"
                        (click)="bukaResend(d)">Resend Document…</button>
              </div>
            }
          </span>
        </div>
      }
    }

    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--line-soft)">
      <span style="font-size:13px;color:var(--muted)">{{ label() }}</span>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-ghost" [disabled]="page() === 0" (click)="pergi(page() - 1)">‹</button>
        <span style="font-size:13px;color:var(--muted)">
          {{ page() + 1 }} / {{ jumlahHalaman() }}
        </span>
        <button class="btn btn-ghost" [disabled]="page() + 1 >= jumlahHalaman()"
                (click)="pergi(page() + 1)">›</button>
      </div>
    </div>
  </div>

  }

  <!-- ── mod BARIS: hanya bila produk dipilih ── -->
  @if (modBaris()) {
    <!--
      Nota, bukan toggle. Pertukaran berlaku secara semula jadi daripada
      tapisan produk; menambah kawalan bermakna kerani perlu faham dua
      konsep sebelum mencari.
    -->
    <div style="background:var(--green-tint);border:1px solid var(--green-line);border-radius:10px;padding:11px 15px;font-size:13px;color:var(--ink);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:14px">
      <span>
        Menunjukkan <b>baris produk</b>, bukan dokumen — satu baris untuk
        setiap tempoh yang dicaj. Nota debit tidak muncul kerana ia tiada
        baris produk.
      </span>
      <button class="btn btn-green" style="white-space:nowrap"
              [disabled]="xlsBusy()" (click)="muatTurunBaris()">
        {{ xlsBusy() ? 'Menjana…' : '⬇ Muat Turun' }}
      </button>
    </div>

    <div style="background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden">
      <div [style.grid-template-columns]="colsBaris"
           style="display:grid;gap:8px;padding:13px 18px;background:var(--surface-alt);font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">
        <span>No. Dokumen</span><span>Akaun</span><span>Issued To</span>
        <span>Produk</span><span>Tempoh</span>
        <span style="text-align:center">Status</span>
        <span style="text-align:right">Jumlah</span>
        <span style="text-align:right">Baki</span>
      </div>

      @if (loading()) {
        <div style="padding:28px;text-align:center;color:var(--muted)">Memuatkan…</div>
      } @else if (baris().length === 0) {
        <div style="padding:28px;text-align:center;color:var(--muted)">
          Tiada baris dijumpai untuk kriteria ini.
        </div>
      } @else {
        @for (l of baris(); track l.lineId) {
          <div [style.grid-template-columns]="colsBaris"
               style="display:grid;gap:8px;padding:13px 18px;border-top:1px solid var(--line-soft);align-items:center;font-size:13.5px"
               [style.opacity]="l.paymentStatus === 'CANCELLED' ? '0.55' : '1'">
            <span style="color:var(--green);font-weight:700">{{ l.docNo }}</span>
            <span style="color:var(--muted-2)">{{ l.accountNo }}</span>
            <span>{{ l.issuedTo }}</span>
            <span>{{ l.productName }}</span>
            <span style="color:var(--muted-2)">{{ l.period || (l.periodStart | date:'MMM yyyy') }}</span>
            <span style="text-align:center">
              <span [style.background]="lencanaBaris(l).bg" [style.color]="lencanaBaris(l).fg"
                    style="font-size:11.5px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap">
                {{ lencanaBaris(l).teks }}
              </span>
            </span>
            <span class="stmt-num" style="text-align:right;font-weight:700;white-space:nowrap">
              {{ l.total | number:'1.2-2' }}
            </span>
            <span class="stmt-num" style="text-align:right;white-space:nowrap"
                  [style.color]="l.outstanding > 0 ? 'var(--red)' : 'var(--muted-2)'">
              {{ l.outstanding | number:'1.2-2' }}
            </span>
          </div>
        }
      }

      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--line-soft)">
        <span style="font-size:13px;color:var(--muted)">{{ label() }}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-ghost" [disabled]="page() === 0" (click)="pergi(page() - 1)">‹</button>
          <span style="font-size:13px;color:var(--muted)">{{ page() + 1 }} / {{ jumlahHalaman() }}</span>
          <button class="btn btn-ghost" [disabled]="page() + 1 >= jumlahHalaman()"
                  (click)="pergi(page() + 1)">›</button>
        </div>
      </div>
    </div>
  }


  <!-- ── modal transaksi ── -->
  @if (txnOpen()) {
    <div class="modal-back top" (click)="txnOpen.set(false)">
      <div class="modal-card stmt-body" style="border-radius:14px;max-width:820px;width:100%;max-height:85vh;overflow:auto"
           (click)="$event.stopPropagation()">
        <div style="padding:22px 26px;border-bottom:1.5px solid var(--line-soft);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:800;font-size:19px;color:var(--ink)">List of Transaction</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">
            {{ txnDoc()?.docNo }}@if (txnKredit()) {<span> · invois yang dibayar</span>}
          </div>
          </div>
          <button class="btn btn-ghost" (click)="txnOpen.set(false)">✕</button>
        </div>

        <div style="padding:0 26px">
          <div style="display:grid;grid-template-columns:130px 1.6fr 70px 100px 110px;gap:8px;padding:13px 0;border-bottom:1.5px solid var(--line-soft);font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">
            <!-- Resit tiada baris dokumen; barisnya ialah ALOKASI, dan
                 lajur pertama membawa nombor invois yang dibayar. -->
            <span>{{ txnKredit() ? 'No. Invois' : 'Kod Produk' }}</span>
            <span>Keterangan</span>
            <span style="text-align:right">Kuantiti</span>
            <span style="text-align:right">{{ txnKredit() ? '' : 'Cukai' }}</span>
            <span style="text-align:right">Amaun</span>
          </div>
          @for (l of txnLines(); track $index) {
            <div style="display:grid;grid-template-columns:130px 1.6fr 70px 100px 110px;gap:8px;padding:11px 0;border-bottom:1px solid var(--line-soft);font-size:13px;align-items:start">
              <span class="stmt-num" style="color:var(--muted-2)">{{ l.productCode || '—' }}</span>
              <span>
                {{ l.description }}
                @if (l.periodStart) {
                  <span style="color:var(--muted)"> · {{ l.periodStart | date:'MMM yyyy' }}</span>
                }
              </span>
              <span class="stmt-num" style="text-align:right">{{ l.quantity | number:'1.2-2' }}</span>
              <span class="stmt-num" style="text-align:right">
                {{ txnKredit() ? '' : (l.taxAmount | number:'1.2-2') }}
              </span>
              <span class="stmt-num" style="text-align:right;font-weight:700">{{ l.amount | number:'1.2-2' }}</span>
            </div>
          }
          @if (txnLines().length === 0) {
            <div style="padding:24px 0;text-align:center;color:var(--muted)">
              {{ txnKredit()
                  ? 'Resit ini belum dipadankan dengan mana-mana invois.'
                  : 'Tiada baris transaksi.' }}
            </div>
          }
        </div>

        <div style="padding:18px 26px;display:flex;justify-content:flex-end;border-top:1.5px solid var(--line-soft)">
          <button class="btn btn-ghost" (click)="txnOpen.set(false)">Tutup</button>
        </div>
      </div>
    </div>
  }

  <!-- ── modal resend ── -->
  @if (resendOpen()) {
    <div class="modal-back" (click)="resendOpen.set(false)">
      <div class="modal-card" style="border-radius:14px;max-width:640px;width:100%"
           (click)="$event.stopPropagation()">
        <div style="padding:22px 26px;border-bottom:1.5px solid var(--line-soft);display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:800;font-size:19px;color:var(--ink)">Resend Document</div>
          <button class="btn btn-ghost" (click)="resendOpen.set(false)">✕</button>
        </div>

        <div style="padding:22px 26px">
          <div style="background:var(--amber-soft);border:1px solid var(--amber);border-radius:9px;padding:11px 14px;font-size:13px;color:var(--ink);margin-bottom:16px">
            Alamat e-mel boleh satu atau lebih. Alamat di sini digunakan untuk
            hantaran ini sahaja — ia tidak menggantikan alamat pada akaun.
          </div>

          <div style="font-size:13px;color:var(--muted);margin-bottom:10px">
            {{ resendDoc()?.title }} <b>{{ resendDoc()?.docNo }}</b> ·
            {{ resendDoc()?.issuedTo }}
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            @for (e of emails(); track $index; let i = $index) {
              <span style="display:inline-flex;align-items:center;gap:7px;background:var(--surface-alt);border:1.5px solid var(--line-input);border-radius:9px;padding:8px 12px;font-size:13px">
                {{ e }}
                <button (click)="buangEmail(i)"
                        style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:15px;line-height:1">✕</button>
              </span>
            }
            <input class="fld" style="flex:1;min-width:220px" type="email"
                   placeholder="Tambah e-mel, tekan Enter"
                   [(ngModel)]="emailBaharu" (keyup.enter)="tambahEmail()" />
          </div>

          @if (resendError()) {
            <div style="color:var(--red);font-size:13px;margin-top:10px">{{ resendError() }}</div>
          }
        </div>

        <div style="padding:18px 26px;display:flex;justify-content:flex-end;gap:10px;border-top:1.5px solid var(--line-soft)">
          <button class="btn btn-ghost" (click)="resendOpen.set(false)">Close</button>
          <button class="btn btn-green" [disabled]="resendBusy() || emails().length === 0"
                  (click)="hantar()">
            {{ resendBusy() ? 'Menghantar…' : 'Hantar' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ── modal batal ── -->
  @if (batalOpen()) {
    <div class="modal-back" (click)="batalOpen.set(false)">
      <div class="modal-card" style="border-radius:14px;max-width:620px;width:100%"
           (click)="$event.stopPropagation()">
        <div style="padding:22px 26px;border-bottom:1.5px solid var(--line-soft);display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:800;font-size:19px;color:var(--ink)">Cancel Document</div>
          <button class="btn btn-ghost" (click)="batalOpen.set(false)">✕</button>
        </div>

        <div style="padding:22px 26px">
          <div style="background:var(--amber-soft);border:1px solid var(--amber);border-radius:9px;padding:12px 14px;font-size:13.5px;color:var(--ink);margin-bottom:18px">
            <b>Transaksi akan dibalikkan</b>, tetapi dokumen tidak dipadam —
            ia kekal dalam rekod sebagai dibatalkan.
            @if (batalDoc()?.docType === 'RECEIPT') {
              <div style="margin-top:8px">
                Invois yang dibayar resit ini akan terbuka semula.
              </div>
            } @else {
              <div style="margin-top:8px">
                Jika invois ini sudah dibayar, duit itu kembali menjadi
                kredit pada akaun dan boleh digunakan untuk bayaran lain.
              </div>
            }
          </div>

          <div style="font-size:13.5px;color:var(--muted);margin-bottom:16px;line-height:1.7">
            <div>{{ batalDoc()?.title }} <b style="color:var(--ink)">{{ batalDoc()?.docNo }}</b></div>
            <div>{{ batalDoc()?.accountNo }} · {{ batalDoc()?.issuedTo }}</div>
            <div>MYR {{ batalDoc()?.amount | number:'1.2-2' }}</div>
          </div>

          <label style="display:block;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">
            <span style="color:var(--red)">*</span> Sebab pembatalan
          </label>
          <textarea class="fld" style="width:100%;min-height:92px;resize:vertical;box-sizing:border-box"
                    placeholder="Kenapa dokumen ini dibatalkan?"
                    [(ngModel)]="batalSebab"></textarea>

          @if (batalError()) {
            <div style="color:var(--red);font-size:13px;margin-top:10px">{{ batalError() }}</div>
          }
        </div>

        <div style="padding:18px 26px;display:flex;justify-content:flex-end;gap:10px;border-top:1.5px solid var(--line-soft)">
          <button class="btn btn-ghost" (click)="batalOpen.set(false)">Close</button>
          <button class="btn" style="background:var(--red);color:#fff;border:none"
                  [disabled]="batalBusy() || !batalSebab.trim()" (click)="sahBatal()">
            {{ batalBusy() ? 'Membatalkan…' : 'Batalkan Dokumen' }}
          </button>
        </div>
      </div>
    </div>
  }
  `
})
export class DocumentsComponent implements OnInit {
  private api = inject(DocumentsService);
  private toast = inject(ToastService);
  private catalog = inject(ProductsService);

  readonly cols = '1.3fr 0.8fr 0.7fr 1.4fr 0.9fr 1fr 0.8fr 1fr 130px';
  readonly colsBaris = '1.3fr 0.7fr 1.3fr 1.2fr 1fr 0.9fr 0.9fr 0.9fr';

  readonly rows = signal<DocumentRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = 10;
  readonly loading = signal(false);
  readonly ralat = signal<string | null>(null);
  readonly lanjutan = signal(false);
  readonly menuFor = signal<number | null>(null);
  readonly pdfBusy = signal<number | null>(null);

  fDocNo = '';
  fAccount = '';
  fDocType = '';
  fPayRef = '';
  fPayStatus = '';
  fFrom = '';
  fTo = '';

  readonly jumlahHalaman = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.size)));
  readonly label = computed(() => {
    const t = this.total();
    if (t === 0) return 'Tiada rekod';
    const dari = this.page() * this.size + 1;
    const hingga = Math.min(t, dari + this.size - 1);
    return `Menunjukkan ${dari}–${hingga} daripada ${t}`;
  });

  ngOnInit() {
    this.catalog.list({ active: true, page: 0, size: 200 })
      .subscribe({ next: r => this.produk.set(r.items), error: () => {} });
    this.muat();
  }

  cari() { this.page.set(0); this.muat(); }
  pergi(p: number) { this.page.set(p); this.muat(); }

  kosongkan() {
    this.fDocNo = ''; this.fAccount = ''; this.fDocType = '';
    this.fPayRef = ''; this.fFrom = ''; this.fTo = ''; this.fPayStatus = '';
    this.fProductId = null;
    this.modBaris.set(false);
    this.cari();
  }

  muat() {
    this.loading.set(true);
    this.menuFor.set(null);

    if (this.modBaris()) {
      this.api.searchLines({
        docNo: this.fDocNo, account: this.fAccount, productId: this.fProductId,
        paymentStatus: this.fPayStatus, issuedFrom: this.fFrom, issuedTo: this.fTo,
        page: this.page(), size: this.size
      }).subscribe({
        next: r => {
          this.baris.set(r.items);
          this.total.set(r.total);
          this.ralat.set(null);
          this.loading.set(false);
        },
        // Ralat MESTI kelihatan. Menelannya bermakna jadual kosong dengan
        // total lama daripada carian dokumen — kelihatan seperti 'tiada
        // data' sedangkan permintaan gagal.
        error: e => {
          this.baris.set([]);
          this.total.set(0);
          this.ralat.set(e?.error?.message ?? `Gagal memuat baris (${e?.status ?? '?'})`);
          this.loading.set(false);
        }
      });
      return;
    }

    this.api.search({
      docNo: this.fDocNo, account: this.fAccount, docType: this.fDocType,
      paymentRefNo: this.fPayRef, issuedFrom: this.fFrom, issuedTo: this.fTo,
      paymentStatus: this.fPayStatus,
      page: this.page(), size: this.size
    }).subscribe({
      next: r => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.ralat.set(null);
        this.loading.set(false);
      },
      error: e => {
        this.rows.set([]);
        this.total.set(0);
        this.ralat.set(e?.error?.message ?? `Gagal memuat dokumen (${e?.status ?? '?'})`);
        this.loading.set(false);
      }
    });
  }

  /**
   * Lencana status — SATU tempat.
   *
   * Dibatalkan mengatasi segalanya. Untuk invois, status BAYARAN yang
   * bermakna; untuk resit dan nota kredit, ia bayaran itu sendiri jadi
   * 'Aktif' betul.
   */
  lencana(d: DocumentRow): { teks: string; bg: string; fg: string } {
    switch (d.paymentStatus) {
      case 'CANCELLED':
        return { teks: 'Batal', bg: 'var(--red-soft)', fg: 'var(--red)' };
      case 'PAID':
        return { teks: 'Lunas', bg: 'var(--green-soft)', fg: 'var(--green-dark)' };
      case 'PARTIAL':
        return { teks: 'Sebahagian', bg: 'var(--amber-soft)', fg: 'var(--ink)' };
      case 'UNPAID':
        return { teks: 'Belum Bayar', bg: 'var(--surface-alt)', fg: 'var(--muted-2)' };
      default:
        return { teks: 'Aktif', bg: 'var(--green-soft)', fg: 'var(--green-dark)' };
    }
  }

  // ── mod BARIS ──────────────────────────────────────────────────────
  //
  // Dipicu oleh pemilihan produk, bukan toggle. Granulariti berubah
  // kerana soalannya berubah: 'invois mana belum lunas' menjadi
  // 'siapa belum bayar produk ini'.
  readonly baris = signal<ProductLineRow[]>([]);
  readonly produk = signal<Product[]>([]);
  readonly xlsBusy = signal(false);
  fProductId: number | null = null;

  readonly modBaris = signal(false);

  pilihProduk(id: number | null) {
    this.fProductId = id;
    this.modBaris.set(id !== null);
    this.cari();
  }

  /** Lencana baris — peraturan sama seperti dokumen, satu tempat. */
  lencanaBaris(l: ProductLineRow): { teks: string; bg: string; fg: string } {
    switch (l.paymentStatus) {
      case 'CANCELLED':
        return { teks: 'Batal', bg: 'var(--red-soft)', fg: 'var(--red)' };
      case 'PAID':
        return { teks: 'Lunas', bg: 'var(--green-soft)', fg: 'var(--green-dark)' };
      case 'PARTIAL':
        return { teks: 'Sebahagian', bg: 'var(--amber-soft)', fg: 'var(--ink)' };
      default:
        return { teks: 'Belum Bayar', bg: 'var(--surface-alt)', fg: 'var(--muted-2)' };
    }
  }

  /**
   * Muat turun senarai baris sebagai CSV.
   *
   * CSV dan bukan XLSX: pelayar boleh menjananya tanpa panggilan
   * tambahan, dan Excel membukanya. Kalau SP perlukan format berformat,
   * itu endpoint XLSX di backend seperti penyata.
   */
  muatTurunBaris() {
    if (this.baris().length === 0) return;
    this.xlsBusy.set(true);

    // Ambil SEMUA baris, bukan halaman semasa — SP memuat turun untuk
    // bekerja di luar sistem, dan sepuluh baris pertama tidak berguna.
    this.api.searchLines({
      docNo: this.fDocNo, account: this.fAccount, productId: this.fProductId,
      paymentStatus: this.fPayStatus, issuedFrom: this.fFrom, issuedTo: this.fTo,
      page: 0, size: 5000
    }).subscribe({
      next: r => {
        const kepala = ['No. Dokumen', 'Akaun', 'Issued To', 'Produk',
                        'Tempoh', 'Status', 'Jumlah', 'Dibayar', 'Baki'];
        const label: Record<string, string> = {
          PAID: 'Lunas', PARTIAL: 'Sebahagian',
          UNPAID: 'Belum Bayar', CANCELLED: 'Batal'
        };
        const petik = (v: unknown) => {
          const t = String(v ?? '');
          return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
        };
        const baris = r.items.map(l => [
          l.docNo, l.accountNo, l.issuedTo, l.productName,
          l.period || '', label[l.paymentStatus] ?? l.paymentStatus,
          l.total.toFixed(2), l.paid.toFixed(2), l.outstanding.toFixed(2)
        ].map(petik).join(','));

        // BOM supaya Excel mengenali UTF-8 — tanpa ia, nama dengan
        // aksara bukan-ASCII menjadi sampah.
        const csv = '\ufeff' + [kepala.join(','), ...baris].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const nama = this.produk().find(p => p.id === this.fProductId)?.name ?? 'produk';
        a.href = url;
        a.download = `bayaran-${nama}-${new Date().toISOString().slice(0, 10)}.csv`
          .replace(/[^A-Za-z0-9.\-_]/g, '_');
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.xlsBusy.set(false);
      },
      error: () => {
        this.xlsBusy.set(false);
        this.toast.error('Gagal muat turun', 'Cuba lagi.');
      }
    });
  }

  toggleMenu(id: number, ev: Event) {
    ev.stopPropagation();
    this.menuFor.set(this.menuFor() === id ? null : id);
  }

  /**
   * Papar PDF dalam tab baharu.
   *
   * Interceptor menyisipkan Authorization dan X-SP-Id, jadi ini tidak
   * boleh menjadi <a href> biasa. Blob dibuka sebagai objek URL.
   */
  paparPdf(d: DocumentRow) {
    this.pdfBusy.set(d.id);
    this.menuFor.set(null);
    this.api.pdf(d).subscribe({
      next: res => {
        const blob = res.body;
        this.pdfBusy.set(null);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Jangan revoke serta-merta — tab baharu masih memuatkannya.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.pdfBusy.set(null);
        this.toast.error('Gagal papar dokumen',
          'Nota kredit belum mempunyai templat sendiri.');
      }
    });
  }

  // ── modal transaksi ──
  readonly txnOpen = signal(false);
  readonly txnDoc = signal<DocumentRow | null>(null);
  readonly txnLines = signal<LineRow[]>([]);

  /**
   * Dokumen kredit (resit, nota kredit) menunjukkan ALOKASI, bukan baris
   * dokumen. Cukai tidak bermakna pada alokasi — ia sudah termasuk dalam
   * baris invois yang dibayar.
   */
  readonly txnKredit = computed(() => {
    const t = this.txnDoc()?.docType;
    return t === 'RECEIPT' || t === 'CREDIT_NOTE';
  });

  bukaTransaksi(d: DocumentRow) {
    this.menuFor.set(null);
    this.txnDoc.set(d);
    this.txnLines.set([]);
    this.txnOpen.set(true);
    this.api.lines(d.id).subscribe({ next: l => this.txnLines.set(l) });
  }

  // ── modal batal ──
  readonly batalOpen = signal(false);
  readonly batalDoc = signal<DocumentRow | null>(null);
  readonly batalBusy = signal(false);
  readonly batalError = signal<string | null>(null);
  batalSebab = '';

  bukaBatal(d: DocumentRow) {
    this.menuFor.set(null);
    this.batalDoc.set(d);
    this.batalSebab = '';
    this.batalError.set(null);
    this.batalOpen.set(true);
  }

  sahBatal() {
    const d = this.batalDoc();
    const sebab = this.batalSebab.trim();
    if (!d || !sebab) return;

    this.batalBusy.set(true);
    this.batalError.set(null);
    this.api.cancel(d.id, sebab).subscribe({
      next: () => {
        this.batalBusy.set(false);
        this.batalOpen.set(false);
        this.toast.success(`${d.title} ${d.docNo} dibatalkan`,
          'Transaksi telah dibalikkan.');
        this.muat();
      },
      error: e => {
        this.batalBusy.set(false);
        this.batalError.set(e?.error?.message ?? 'Gagal membatalkan dokumen.');
      }
    });
  }

  // ── modal resend ──
  readonly resendOpen = signal(false);
  readonly resendDoc = signal<DocumentRow | null>(null);
  readonly emails = signal<string[]>([]);
  readonly resendBusy = signal(false);
  readonly resendError = signal<string | null>(null);
  emailBaharu = '';

  bukaResend(d: DocumentRow) {
    this.menuFor.set(null);
    this.resendDoc.set(d);
    this.emails.set([]);
    this.emailBaharu = '';
    this.resendError.set(null);
    this.resendOpen.set(true);
  }

  tambahEmail() {
    const e = this.emailBaharu.trim();
    if (!e) return;
    // Semakan minimum. Backend dan penyedia e-mel yang menentukan sah
    // atau tidak; regex penuh di sini akan menolak alamat yang sah.
    if (!e.includes('@') || !e.includes('.')) {
      this.resendError.set('Alamat e-mel tidak sah.');
      return;
    }
    if (this.emails().includes(e)) {
      this.emailBaharu = '';
      return;
    }
    this.emails.set([...this.emails(), e]);
    this.emailBaharu = '';
    this.resendError.set(null);
  }

  buangEmail(i: number) {
    this.emails.set(this.emails().filter((_, idx) => idx !== i));
  }

  hantar() {
    const d = this.resendDoc();
    if (!d || this.emails().length === 0) return;

    this.resendBusy.set(true);
    this.resendError.set(null);
    this.api.resend(d.id, this.emails()).subscribe({
      next: r => {
        this.resendBusy.set(false);
        this.resendOpen.set(false);
        this.toast.success(`${d.title} ${d.docNo} dihantar`,
          r.recipients.join(', '));
      },
      error: e => {
        this.resendBusy.set(false);
        this.resendError.set(e?.error?.message ?? 'Gagal menghantar dokumen.');
      }
    });
  }
}
