import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdhocService, AdhocSiap, PeriodOption } from './adhoc.service';
import { AccountsService } from '../accounts/accounts.service';
import { ProductsService } from '../products/products.service';
import { SettingsService } from '../settings/settings.service';
import { Product } from '../../core/models/product.model';
import { Account } from '../../core/models/account.model';
import { ToastService } from '../../core/ui/toast.service';
import { tarikhIso, bulanIso } from '../../core/tarikh';

interface BarisProduk {
  produk: Product;
  dipilih: boolean;
  kuantiti: number;
}

/**
 * Adhoc Invois — terbitkan invois kepada pelanggan luar atau dalaman.
 *
 * Caj clamp kepada pemandu yang meletak kereta dalam kawasan JMB; jualan
 * buku pada pameran sekolah. Penerima menerima e-mel dengan pautan
 * bayaran dan biasanya tidak akan kembali.
 *
 * SATU penerima setiap invois. Reka bentuk asal mempunyai berbilang baris
 * akaun, tetapi satu set produk untuk semua — pemilik produk
 * menggugurkannya: satu adhoc invois untuk satu penerima.
 *
 * Penerima BUKAN pelanggan tidak memerlukan akaun. Di backend semuanya
 * berkongsi satu akaun ADHOC-SALES teknikal (V50) supaya sub-ledger
 * ledger tidak NULL, tetapi itu tidak kelihatan di sini.
 */
@Component({
  selector: 'app-adhoc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div style="max-width:1080px">
    <h1 class="h1" style="margin:0 0 4px">Adhoc Invois</h1>
    <p style="color:var(--muted);margin:0 0 22px;font-size:15px">
      Terbitkan invois kepada pelanggan luar atau dalaman.
    </p>

    <!-- ── tempoh & tarikh akhir ── -->
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
        <div>
          <label style="display:block;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">
            <span style="color:var(--red)">*</span> Tempoh
          </label>
          <select class="fld" style="width:100%" [(ngModel)]="periodId">
            <option [ngValue]="null">Pilih tempoh</option>
            @for (p of tempoh(); track p.periodId) {
              <option [ngValue]="p.periodId">{{ p.name }}</option>
            }
          </select>
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">
            <span style="color:var(--red)">*</span> Tarikh Akhir Bayaran
          </label>
          <input class="fld" style="width:100%;box-sizing:border-box" type="date" [(ngModel)]="dueDate" />
        </div>
      </div>
    </div>

    <!-- ── penerima ── -->
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-family:'Sora',sans-serif;font-weight:800;font-size:18px;margin:0">Penerima</h3>
        @if (akaunDipilih()) {
          <button class="btn btn-ghost" (click)="lepaskanAkaun()">Tukar kepada bukan pelanggan</button>
        }
      </div>

      <div style="display:grid;grid-template-columns:1.4fr 1.6fr 1.2fr;gap:12px">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">
            Akaun
          </label>
          <div style="display:flex">
            <input class="fld" style="flex:1;border-radius:9px 0 0 9px;border-right:none"
                   [value]="akaunDipilih()?.no ?? ''"
                   placeholder="Bukan pelanggan" readonly />
            <button (click)="bukaCariAkaun()"
                    style="width:44px;background:var(--green);color:#fff;border:none;border-radius:0 9px 9px 0;cursor:pointer;font-size:15px">🔍</button>
          </div>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">
            <span style="color:var(--red)">*</span> Nama
          </label>
          <!-- Terisi automatik daripada akaun, tetapi masih boleh diedit:
               invois mungkin ditujukan kepada wakil, atau nama akaun
               sudah lapuk. Nilai yang ditaip digunakan untuk invois INI
               sahaja dan tidak mengubah akaun. -->
          <!-- HURUF BESAR semasa menaip. Nama penerima muncul pada
               invois dan resit; nama yang ditaip huruf kecil kelihatan
               tidak kemas di sebelah data lain, dan kerani tidak
               sepatutnya perlu ingat menekan Caps Lock.
               (input) dengan menulis semula elemen, bukan
               (ngModelChange): nilai ditapis tetapi Angular tidak
               menulis semula ke medan biasa, jadi huruf kecil kekal
               kelihatan (sama seperti telefon di bawah). -->
          <input class="fld" style="width:100%;box-sizing:border-box" [(ngModel)]="nama"
                 (input)="besarkanNama($event)"
                 placeholder="NAMA PENERIMA" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">
            Telefon
          </label>
          <!-- Digit, ruang, tanda tolak dan + sahaja. Tanpa sekatan
               kerani menaip nota di sini dan medan itu menjadi tidak
               berguna untuk menghubungi sesiapa. -->
          <!-- keydown menyekat SEBELUM aksara masuk. [ngModel] sehala
               dengan penapis dalam (ngModelChange) tidak berkesan: nilai
               ditapis tetapi Angular tidak menulis semula ke input kerana
               telefon ialah medan biasa, jadi huruf kekal kelihatan. -->
          <input class="fld" style="width:100%;box-sizing:border-box"
                 inputmode="tel" maxlength="20" [(ngModel)]="telefon"
                 (keydown)="tapisTelefon($event)"
                 (paste)="tampalTelefon($event)"
                 placeholder="0123456789" />
        </div>
      </div>

      <div style="margin-top:12px">
        <label style="display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">
          E-mel
        </label>
        <input class="fld" style="width:100%;box-sizing:border-box" type="email" [(ngModel)]="emel"
               placeholder="Invois dan pautan bayaran dihantar ke alamat ini" />
        @if (!emel.trim()) {
          <div style="font-size:12px;color:var(--muted);margin-top:5px">
            Tanpa e-mel, invois mesti dicetak dan diserahkan sendiri.
          </div>
        }
      </div>
    </div>

    <!-- ── catatan ── -->
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px">
      <label style="display:block;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:8px">
        Catatan
      </label>
      <textarea class="fld" style="width:100%;min-height:96px;resize:vertical;box-sizing:border-box"
                maxlength="500" [(ngModel)]="catatan"
                placeholder="Sebab caj ini dikeluarkan — muncul pada invois"></textarea>
      <div style="text-align:right;font-size:12px;color:var(--muted);margin-top:6px">
        {{ catatan.length }} / 500
      </div>
    </div>

    <!-- ── produk ── -->
    <div style="background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px">
      <h3 style="font-family:'Sora',sans-serif;font-weight:800;font-size:18px;margin:0 0 14px">
        Pilih Produk
      </h3>

      <div style="border:1px solid var(--line);border-radius:12px;overflow:hidden">
        <div style="display:grid;grid-template-columns:50px 1.2fr 2fr 100px 1fr 1fr;background:var(--surface-alt);padding:12px 18px;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">
          <span></span><span>Kod</span><span>Nama Produk</span>
          <span style="text-align:right">Kuantiti</span>
          <span style="text-align:right">Harga</span>
          <span style="text-align:right">Amaun</span>
        </div>

        @if (baris().length === 0) {
          <div style="padding:26px;text-align:center;color:var(--muted)">
            Tiada produk <b>Per Use</b>. Invois adhoc hanya menggunakan
            produk jenis Per Use — tambah satu dalam skrin Produk dahulu.
          </div>
        }

        @for (b of baris(); track b.produk.id) {
          <div style="display:grid;grid-template-columns:50px 1.2fr 2fr 100px 1fr 1fr;padding:13px 18px;font-size:14px;border-top:1px solid var(--line-soft);align-items:center"
               [style.background]="b.dipilih ? 'var(--green-tint)' : 'transparent'">
            <input type="checkbox" [checked]="b.dipilih" (change)="toggle(b)"
                   style="width:18px;height:18px;accent-color:var(--green);cursor:pointer" />
            <span style="color:var(--muted-2);font-weight:600">{{ b.produk.code }}</span>
            <span>{{ b.produk.name }}</span>
            <span style="text-align:right">
              <input type="number" min="1" step="1" [ngModel]="b.kuantiti"
                     (ngModelChange)="tetapKuantiti(b, $event)"
                     [disabled]="!b.dipilih"
                     style="width:72px;padding:7px 9px;border:1.5px solid var(--line-input);border-radius:8px;font-size:14px;text-align:right;background:var(--surface);color:var(--ink)" />
            </span>
            <span class="stmt-num" style="text-align:right;color:var(--muted-2)">
              {{ b.produk.rate | number:'1.2-2' }}
            </span>
            <span class="stmt-num" style="text-align:right;font-weight:700">
              {{ b.dipilih ? (amaunBaris(b) | number:'1.2-2') : '—' }}
            </span>
          </div>
        }
      </div>

      <div style="display:flex;align-items:center;justify-content:flex-end;gap:24px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line-soft)">
        <span style="font-size:14px;color:var(--muted)">{{ bilDipilih() }} produk dipilih</span>
        <span class="stmt-num" style="font-family:'Sora',sans-serif;font-weight:800;font-size:22px;color:var(--ink)">
          MYR {{ jumlah() | number:'1.2-2' }}
        </span>
      </div>
    </div>

    @if (ralat()) {
      <div style="background:var(--red-soft);border:1px solid var(--red);border-radius:10px;padding:12px 15px;font-size:13.5px;color:var(--red);margin-bottom:14px">
        {{ ralat() }}
      </div>
    }

    @if (!sah()) {
      <!-- Butang yang keras tanpa sebab menjadikan skrin kelihatan rosak.
           Kerani tidak sepatutnya meneka syarat mana yang belum dipenuhi. -->
      <div style="font-size:13px;color:var(--muted);text-align:right;margin-bottom:8px">
        {{ kenapaTakSah() }}
      </div>
    }

    <div style="display:flex;justify-content:flex-end;gap:10px;padding-bottom:32px">
      <button class="btn btn-ghost" (click)="kosongkan()">Batal</button>
      <button class="btn btn-green" [disabled]="busy() || !sah()" (click)="hantar()"
              [title]="sah() ? '' : kenapaTakSah()">
        {{ busy() ? 'Menjana…' : 'Jana Invois' }}
      </button>
    </div>
  </div>


  <!-- ── skrin kejayaan ── -->
  @if (siap(); as r) {
    <div class="modal-back" (click)="$event.stopPropagation()">
      <div class="modal-card" style="border-radius:16px;max-width:620px;width:100%;padding:44px 40px;text-align:center">
        <div style="width:96px;height:96px;border:4px solid var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;font-size:46px;color:var(--green)">✓</div>

        <h2 style="font-family:'Sora',sans-serif;font-weight:800;font-size:24px;color:var(--ink);margin:0 0 20px">
          Invois Berjaya Dijana
        </h2>

        <div style="text-align:left;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:24px">
          <div style="display:grid;grid-template-columns:1fr 1.4fr">
            <div style="padding:12px 16px;background:var(--surface-alt);font-size:13px;font-weight:700;color:var(--muted);border-bottom:1px solid var(--line-soft)">No. Dokumen</div>
            <div class="stmt-num" style="padding:12px 16px;font-size:14px;font-weight:700;color:var(--ink);border-bottom:1px solid var(--line-soft)">{{ r.docNo }}</div>

            <div style="padding:12px 16px;background:var(--surface-alt);font-size:13px;font-weight:700;color:var(--muted);border-bottom:1px solid var(--line-soft)">Issued To</div>
            <div style="padding:12px 16px;font-size:14px;color:var(--ink);border-bottom:1px solid var(--line-soft)">{{ r.issuedTo }}</div>

            <div style="padding:12px 16px;background:var(--surface-alt);font-size:13px;font-weight:700;color:var(--muted);border-bottom:1px solid var(--line-soft)">Issued Date</div>
            <div class="stmt-num" style="padding:12px 16px;font-size:14px;color:var(--ink);border-bottom:1px solid var(--line-soft)">{{ r.issuedDate | date:'dd/MM/yyyy' }}</div>

            <div style="padding:12px 16px;background:var(--surface-alt);font-size:13px;font-weight:700;color:var(--muted)">Amount</div>
            <div class="stmt-num" style="padding:12px 16px;font-size:16px;font-weight:800;color:var(--ink)">MYR {{ r.total | number:'1.2-2' }}</div>
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn-green" [disabled]="pdfBusy()" (click)="cetakInvois(r)">
            {{ pdfBusy() ? 'Menjana…' : 'Cetak Invois' }}
          </button>
          <button class="btn btn-ghost" (click)="siap.set(null)">
            Kembali ke Adhoc Invois
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ── modal cari akaun ── -->
  @if (cariOpen()) {
    <div class="modal-back top" (click)="cariOpen.set(false)">
      <div class="modal-card" style="border-radius:14px;max-width:980px;width:100%;max-height:86vh;overflow:auto"
           (click)="$event.stopPropagation()">
        <div style="padding:22px 26px;border-bottom:1.5px solid var(--line-soft);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:800;font-size:19px;color:var(--ink)">Pilih Akaun</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">
              Cari akaun pelanggan sedia ada.
            </div>
          </div>
          <button class="btn btn-ghost" (click)="cariOpen.set(false)">✕</button>
        </div>

        <!--
          Tab Aktif/Tidak Aktif dan butang Tambah Akaun sengaja tiada:
          skrin ini untuk MEMILIH akaun, bukan mengurusnya. Akaun tidak
          aktif tidak sepatutnya menerima invois baharu.
        -->
        <div style="padding:20px 26px;border-bottom:1px solid var(--line-soft)">
          <!-- Empat medan seperti skrin Akaun, tanpa Balance From/To:
               menapis ikut baki tidak membantu memilih penerima invois. -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <input class="fld" placeholder="Akaun"
                   [(ngModel)]="cariAkaunNo" (keyup.enter)="cariAkaun()" />
            <input class="fld" placeholder="Nama"
                   [(ngModel)]="cariTeks" (keyup.enter)="cariAkaun()" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
            <select class="fld" [(ngModel)]="cariKategori">
              <option [ngValue]="null">Semua Kategori</option>
              @for (k of kategori(); track k.id) {
                <option [ngValue]="k.id">{{ k.name }}</option>
              }
            </select>
            <select class="fld" [(ngModel)]="cariLinked">
              <option [ngValue]="null">Semua Status Pautan</option>
              <option [ngValue]="true">Sudah dipaut</option>
              <option [ngValue]="false">Belum dipaut</option>
            </select>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
            <button class="btn btn-navy" (click)="cariAkaun()">Search</button>
            <button class="btn btn-ghost" (click)="kosongkanCarian()">Clear</button>
          </div>
        </div>

        <div style="padding:0 26px 22px">
          <div style="display:grid;grid-template-columns:1fr 2fr 2fr 1.2fr;gap:12px;padding:14px 4px;border-bottom:1.5px solid var(--line-soft);font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">
            <span>Akaun</span><span>Nama</span><span>Bill To</span>
            <span style="text-align:right">Baki</span>
          </div>

          @if (cariBusy()) {
            <div style="padding:26px;text-align:center;color:var(--muted)">Memuatkan…</div>
          } @else if (hasilCari().length === 0) {
            <div style="padding:26px;text-align:center;color:var(--muted)">
              {{ pernahCari() ? 'Tiada akaun dijumpai.' : 'Tekan Search untuk memaparkan akaun.' }}
            </div>
          } @else {
            @for (a of hasilCari(); track a.id) {
              <div (click)="pilihAkaun(a)"
                   style="display:grid;grid-template-columns:1fr 2fr 2fr 1.2fr;gap:12px;padding:13px 4px;border-bottom:1px solid var(--line-soft);cursor:pointer;font-size:14px;align-items:center">
                <span style="color:var(--green);font-weight:700">{{ a.no }}</span>
                <span>{{ a.name }}</span>
                <span style="color:var(--muted-2)">{{ a.billTo || '—' }}</span>
                <span class="stmt-num" style="text-align:right;font-weight:700"
                      [style.color]="a.balance > 0 ? 'var(--red)' : 'var(--green-dark)'">
                  {{ a.balance | number:'1.2-2' }}
                </span>
              </div>
            }

            <div style="display:flex;align-items:center;justify-content:space-between;padding-top:14px">
              <span style="font-size:13px;color:var(--muted)">
                {{ cariTotal() }} akaun dijumpai
              </span>
              <div style="display:flex;gap:6px;align-items:center">
                <button class="btn btn-ghost" [disabled]="cariPage() === 0"
                        (click)="cariPage.set(cariPage() - 1); cariAkaun(true)">‹</button>
                <span style="font-size:13px;color:var(--muted)">
                  {{ cariPage() + 1 }} / {{ cariJumlahHalaman() }}
                </span>
                <button class="btn btn-ghost"
                        [disabled]="cariPage() + 1 >= cariJumlahHalaman()"
                        (click)="cariPage.set(cariPage() + 1); cariAkaun(true)">›</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  }
  `
})
export class AdhocComponent implements OnInit {
  private api = inject(AdhocService);
  private accounts = inject(AccountsService);
  private catalog = inject(ProductsService);
  private settings = inject(SettingsService);
  private toast = inject(ToastService);

  readonly tempoh = signal<PeriodOption[]>([]);
  readonly baris = signal<BarisProduk[]>([]);
  readonly busy = signal(false);
  readonly ralat = signal<string | null>(null);

  periodId: number | null = null;
  dueDate = '';
  nama = '';
  emel = '';
  telefon = '';
  catatan = '';

  readonly akaunDipilih = signal<Account | null>(null);

  ngOnInit() {
    this.api.periods().subscribe({
      next: p => {
        this.tempoh.set(p);
        // Lalai tempoh SEMASA — invois adhoc biasanya untuk bulan ini.
        const kini = bulanIso();
        this.periodId = p.find(x => x.startDt?.startsWith(kini))?.periodId
          ?? p[p.length - 1]?.periodId ?? null;
      }
    });

    // PER_USE sahaja. Produk langganan (MAINTENANCE FEE, SINKING FUND)
    // untuk pelanggan tetap dan tidak masuk akal pada invois adhoc —
    // memaparkannya bermakna kerani perlu tahu yang mana boleh dipilih.
    //
    // Ditapis di sini dan bukan di backend: dua ratus produk ialah
    // muatan kecil, dan menambah parameter untuk satu skrin tidak
    // berbaloi.
    this.catalog.list({ active: true, page: 0, size: 200 }).subscribe({
      next: r => this.baris.set(
        r.items
          .filter(p => p.chargeFrequency === 'PER_USE')
          .map(p => ({ produk: p, dipilih: false, kuantiti: 1 })))
    });

    // Kategori AKAUN (account_category), bukan kategori PRODUK.
    //
    // Carian di bawahnya menapis a.category_id. Panggilan asal
    // menggunakan catalog.categories() -> /api/v1/product-categories:
    // jadual yang berbeza, konsep yang berbeza, nama yang hampir sama.
    //
    // Ia kelihatan seperti dropdown kosong kerana product_category
    // kebetulan tiada baris. Kalau SP mencipta kategori produk, dropdown
    // akan memaparkan senarai yang SALAH dan kelihatan berfungsi.
    this.settings.accountCategories().subscribe({
      next: k => this.kategori.set(k),
      error: () => this.toast.error('Kategori akaun gagal dimuat.')
    });

    // Lalai tarikh akhir: dua minggu dari hari ini.
    const d = new Date();
    d.setDate(d.getDate() + 14);
    this.dueDate = tarikhIso(d);
  }

  amaunBaris(b: BarisProduk): number {
    return (b.produk.rate ?? 0) * (b.kuantiti || 0);
  }

  readonly bilDipilih = computed(() => this.baris().filter(b => b.dipilih).length);
  readonly jumlah = computed(() =>
    this.baris().filter(b => b.dipilih)
      .reduce((t, b) => t + this.amaunBaris(b), 0));

  toggle(b: BarisProduk) {
    b.dipilih = !b.dipilih;
    this.baris.set([...this.baris()]);
  }

  tetapKuantiti(b: BarisProduk, v: number) {
    // Kuantiti sifar atau negatif ditolak oleh backend; halang di sini
    // supaya kerani tidak menunggu permintaan untuk mengetahuinya.
    b.kuantiti = Math.max(1, Math.floor(Number(v) || 1));
    this.baris.set([...this.baris()]);
  }

  /**
   * KAEDAH BIASA, bukan computed().
   *
   * computed() hanya menjejak SIGNAL. periodId, dueDate dan nama ialah
   * medan biasa terikat melalui ngModel, jadi computed dinilai semula
   * hanya apabila baris() berubah — keadaannya basi dan tidak boleh
   * diramal: butang kelihatan hijau sementara sah() masih memegang nilai
   * lama.
   *
   * Kesilapan yang SAMA dibuat pada modBaris dalam skrin Dokumen
   * Kewangan pagi ini (74fde48). Kaedah biasa dinilai pada setiap
   * pusingan pengesanan perubahan — betul, dan cukup murah untuk borang.
   */
  sah(): boolean {
    return this.periodId !== null
        && !!this.dueDate
        && this.nama.trim().length > 0
        && this.baris().some(b => b.dipilih);
  }

  /**
   * Skrin kejayaan — popup besar, bukan toast.
   *
   * Kerani perlukan nombor dokumen untuk merujuknya, dan pautan cetak
   * SERTA-MERTA: penerima adhoc selalunya berdiri di kaunter menunggu
   * salinan bercetak.
   */
  readonly siap = signal<AdhocSiap | null>(null);
  readonly pdfBusy = signal(false);

  cetakInvois(r: AdhocSiap) {
    this.pdfBusy.set(true);
    this.api.pdf(r.documentId).subscribe({
      next: res => {
        this.pdfBusy.set(false);
        const blob = res.body;
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: e => {
        this.pdfBusy.set(false);
        this.toast.error(`Gagal papar invois (${e?.status ?? '?'})`,
          e?.error?.message ?? 'Cuba lagi.');
      }
    });
  }

  /** Digit, ruang, tanda tolak dan + sahaja. */
  /** Nama penerima sentiasa HURUF BESAR — pada dokumen dan dalam DB. */
  besarkanNama(e: Event) {
    const el = e.target as HTMLInputElement;
    const kursor = el.selectionStart;
    const besar = el.value.toUpperCase();
    if (besar !== el.value) {
      el.value = besar;
      // Kursor melompat ke hujung tanpa ini apabila kerani menyunting
      // bahagian tengah nama.
      el.setSelectionRange(kursor, kursor);
    }
    this.nama = besar;
  }

  tapisTelefon(e: KeyboardEvent) {
    // Kekunci kawalan mesti lulus: tanpa ini Backspace dan Ctrl+A mati.
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
    // DIGIT sahaja. Ruang, tanda tolak dan + dibenarkan sebelum ini,
    // yang bermakna nombor yang sama boleh disimpan dalam empat bentuk
    // berbeza — '012-345 6789', '0123456789', '+60123456789'. Mencari
    // atau membandingkan nombor kemudian memerlukan normalisasi di
    // setiap tempat yang membacanya. Normalisasi SEKALI, semasa input.
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  }

  tampalTelefon(e: ClipboardEvent) {
    const teks = e.clipboardData?.getData('text') ?? '';
    const bersih = teks.replace(/[^0-9]/g, '');
    if (bersih !== teks) {
      e.preventDefault();
      this.telefon = (this.telefon + bersih).slice(0, 20);
    }
  }

  kenapaTakSah(): string {
    const kurang: string[] = [];
    if (this.periodId === null) kurang.push('tempoh');
    if (!this.dueDate) kurang.push('tarikh akhir');
    if (!this.nama.trim()) kurang.push('nama penerima');
    if (!this.baris().some(b => b.dipilih)) kurang.push('sekurang-kurangnya satu produk');
    return kurang.length ? 'Perlu: ' + kurang.join(', ') + '.' : '';
  }

  // ── modal cari akaun ──
  readonly cariOpen = signal(false);
  readonly hasilCari = signal<Account[]>([]);
  cariTeks = '';

  readonly kategori = signal<{ id: number; name: string }[]>([]);
  readonly cariBusy = signal(false);
  cariAkaunNo = '';
  readonly cariTotal = signal(0);
  readonly cariPage = signal(0);
  readonly pernahCari = signal(false);
  readonly cariSaiz = 10;
  cariKategori: number | null = null;
  cariLinked: boolean | null = null;

  readonly cariJumlahHalaman = computed(() =>
    Math.max(1, Math.ceil(this.cariTotal() / this.cariSaiz)));

  bukaCariAkaun() {
    this.cariOpen.set(true);
    if (!this.pernahCari()) {
      // Muat senarai pertama terus — modal kosong dengan kotak carian
      // memaksa kerani menekan Search sebelum melihat apa-apa.
      this.cariAkaun();
    }
  }

  /**
   * Akaun AKTIF sahaja — akaun tidak aktif tidak sepatutnya menerima
   * invois baharu, jadi tab Aktif/Tidak Aktif tidak ditawarkan.
   */
  cariAkaun(kekalHalaman = false) {
    if (!kekalHalaman) this.cariPage.set(0);
    this.cariBusy.set(true);
    this.accounts.list({
      active: true,
      // Backend menerima satu 'q' yang memadankan no. akaun ATAU nama.
      // Dua medan digabungkan; kalau kedua-duanya diisi, nombor menang
      // kerana ia lebih tepat.
      q: this.cariAkaunNo.trim() || this.cariTeks.trim() || null,
      category: this.cariKategori,
      linked: this.cariLinked,
      page: this.cariPage(),
      size: this.cariSaiz
    }).subscribe({
      next: r => {
        this.hasilCari.set(r.items);
        this.cariTotal.set(r.total);
        this.pernahCari.set(true);
        this.cariBusy.set(false);
      },
      error: () => {
        this.hasilCari.set([]);
        this.cariBusy.set(false);
      }
    });
  }

  kosongkanCarian() {
    this.cariAkaunNo = '';
    this.cariTeks = '';
    this.cariKategori = null;
    this.cariLinked = null;
    this.cariAkaun();
  }

  /**
   * Akaun dipilih: butiran terisi automatik dan dikunci.
   *
   * Butiran datang daripada akaun, jadi mengeditnya di sini akan
   * mencipta dua sumber untuk satu fakta — tukar pada skrin Akaun.
   */
  pilihAkaun(a: Account) {
    this.akaunDipilih.set(a);
    this.nama = a.billTo || a.name || '';
    // AccountDto tidak membawa e-mel atau telefon — hanya no, nama dan
    // billTo. Kerani mengisinya sendiri, atau backend menggunakan alamat
    // akaun apabila menghantar (invois berakaun tidak memerlukan medan
    // issued_to_* langsung).
    this.cariOpen.set(false);
  }

  lepaskanAkaun() {
    this.akaunDipilih.set(null);
    this.nama = '';
    this.emel = '';
    this.telefon = '';
  }

  kosongkan() {
    this.lepaskanAkaun();
    this.catatan = '';
    this.baris.set(this.baris().map(b => ({ ...b, dipilih: false, kuantiti: 1 })));
    this.ralat.set(null);
  }

  hantar() {
    if (!this.sah()) return;
    this.busy.set(true);
    this.ralat.set(null);

    this.api.create({
      accountId: this.akaunDipilih()?.id ?? null,
      issuedToName: this.nama.trim(),
      issuedToEmail: this.emel.trim() || null,
      issuedToPhone: this.telefon.trim() || null,
      periodId: this.periodId!,
      dueDate: this.dueDate,
      remarks: this.catatan.trim() || null,
      lines: this.baris().filter(b => b.dipilih)
        .map(b => ({ productId: b.produk.id!, quantity: b.kuantiti }))
    }).subscribe({
      next: r => {
        this.busy.set(false);
        // Butiran disimpan SEBELUM kosongkan() — ia membaca medan borang
        // yang akan direset.
        this.siap.set({
          documentId: r.documentId,
          docNo: r.docNo,
          issuedTo: this.nama.trim(),
          issuedDate: tarikhIso(),
          total: r.total
        });
        this.kosongkan();
      },
      error: e => {
        this.busy.set(false);
        this.ralat.set(e?.error?.message
          ?? `Gagal menjana invois (${e?.status ?? '?'})`);
      }
    });
  }
}
