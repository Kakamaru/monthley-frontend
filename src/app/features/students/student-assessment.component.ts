import { Component, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PELAJAR, KELAS, SUBJEK, PENGGAL, PANGKAT, KOMPONEN, Student,
  inisial, guruKelas, pangkatBagi
} from './students.mock';

/**
 * Penilaian Pelajar — MOCKUP.
 *
 * Markah 0–100 setiap mata pelajaran; pangkat DITERBITKAN daripada markah
 * dan bukan dimasukkan berasingan. Slip sebenar SRITI menunjukkan model
 * ini: 47 → Maqbul, 76 → Jayyid Jiddan. Membenarkan guru memilih pangkat
 * secara bebas bermakna markah dan pangkat boleh bercanggah.
 */
@Component({
  selector: 'app-student-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="m-fade">
      <div class="hdr">
        <div>
          <h1>Penilaian Pelajar</h1>
          <p>Markah &amp; pangkat mengikut sembilan mata pelajaran KAFA / UPKK.</p>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <span class="mock-chip">Mockup — data contoh</span>
          <button class="btn green" (click)="bukaSlipKelas()">⬇ Slip Penilaian Kelas</button>
        </div>
      </div>

      <div class="toolbar">
        <div>
          <label class="tool-lbl">Kelas</label>
          <select class="fld" [(ngModel)]="kelas" style="width:auto">
            @for (k of senaraiKelas; track k) { <option [value]="k">{{ k }}</option> }
          </select>
        </div>
        <div>
          <label class="tool-lbl">Mata Pelajaran</label>
          <select class="fld" [(ngModel)]="subjek" style="width:auto">
            @for (s of subjekSenarai; track s.nama) {
              <option [value]="s.nama">{{ s.nama }}</option>
            }
          </select>
        </div>
        <div>
          <label class="tool-lbl">Penilaian</label>
          <select class="fld" [(ngModel)]="penggal" style="width:auto">
            @for (p of penggalSenarai; track p) { <option [value]="p">{{ p }}</option> }
          </select>
        </div>
        <button class="btn green push">💾 Simpan Penilaian</button>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-lbl">Purata Markah</div>
          <div class="stat-val" style="color:#16a34a">{{ purata() }}</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">Cemerlang (75+)</div>
          <div class="stat-val" style="color:#0f7a52">{{ cemerlang() }}</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">Perlu Bimbingan (&lt;40)</div>
          <div class="stat-val" style="color:#c26a1f">{{ perluBimbingan() }}</div>
        </div>
      </div>

      <div class="assess-grid">
        <div class="tbl">
          <div class="tr th" style="grid-template-columns:.9fr 1.9fr 1.1fr 1.3fr .7fr">
            <span>No.</span><span>Nama</span>
            <span style="text-align:center">Markah / 100</span>
            <span style="text-align:right">Pangkat</span>
            <span style="text-align:right">Slip</span>
          </div>

          @for (s of roster(); track s.no) {
            <div class="tr" style="grid-template-columns:.9fr 1.9fr 1.1fr 1.3fr .7fr">
              <span class="no">{{ s.no }}</span>
              <span class="nm">
                <span class="ava-sm">{{ ini(s.name) }}</span>{{ s.name }}
              </span>
              <span style="text-align:center">
                <input class="mark-in" type="number" min="0" max="100"
                       [ngModel]="markah()[s.no]"
                       (ngModelChange)="set(s.no, $event)" placeholder="—" />
              </span>
              <span style="text-align:right">
                @if (pangkat(s.no); as p) {
                  <span class="pill" [style.background]="p.bg" [style.color]="p.c">
                    {{ p.nama }}
                  </span>
                } @else {
                  <span class="muted" style="font-size:12.5px">—</span>
                }
              </span>
              <span style="text-align:right">
                <button (click)="bukaSlip(s)" title="Slip pelajar"
                        style="width:34px;height:34px;border-radius:9px;
                        border:1.5px solid var(--line);background:var(--surface);
                        color:#16a34a;cursor:pointer">📄</button>
              </span>
            </div>
          }

          @if (!roster().length) {
            <div class="empty">Tiada pelajar aktif dalam kelas ini.</div>
          }
        </div>

        <div>
          <div class="card" style="margin:0 0 16px">
            <h3 style="margin-bottom:4px">Skala Pangkat</h3>
            <p class="sub" style="margin:0 0 14px">Pangkat diterbitkan daripada markah</p>
            @for (p of pangkatSenarai; track p.nama) {
              <div class="legend-tp">
                <span class="tp-chip" style="width:62px"
                      [style.background]="p.bg" [style.color]="p.c">
                  {{ p.min }}–{{ p.max }}
                </span>
                <div style="min-width:0">
                  <div class="legend-arab">{{ p.nama }}</div>
                </div>
              </div>
            }
          </div>

          <div class="card" style="margin:0">
            <h3 style="margin-bottom:4px">Wajaran Keseluruhan</h3>
            <p class="sub" style="margin:0 0 14px">
              Mata pelajaran hanya sebahagian daripada penilaian
            </p>
            @for (k of komponenSenarai; track k.nama) {
              <div class="legend-tp">
                <span class="tp-chip" style="width:52px;background:#eef4ff;color:#2a6fdb">
                  {{ k.wajaran }}%
                </span>
                <div class="legend-arab">{{ k.nama }}</div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- ===== SLIP INDIVIDU ===== -->
    @if (slip(); as s) {
      <div class="mdl-ov">
        <div class="mdl w760">
          <div class="mdl-bar">
            <h3>Slip Laporan Kemajuan Murid</h3>
            <div style="display:flex;gap:8px">
              <button class="b-pri" style="padding:9px 16px;font-size:13px"
                      (click)="cetak()">⬇ PDF</button>
              <button class="mdl-x" (click)="cetak()" title="Cetak">🖨</button>
              <button class="mdl-x" (click)="slip.set(null)">&times;</button>
            </div>
          </div>

          <div style="padding:28px 34px" class="cetak-area">
            <div style="text-align:center;margin-bottom:22px">
              <img src="assets/monthley-badge.png" alt=""
                   style="height:56px;width:56px;border-radius:14px;margin-bottom:10px" />
              <div class="slip-org" style="font-size:15px;line-height:1.5">
                SEKOLAH RENDAH INTEGRASI TERAS ISLAM<br />TAHFIZ AS-SYAKIRIN
              </div>
              <div style="font-family:'Sora',sans-serif;font-weight:700;
                          font-size:13.5px;color:var(--ink);margin-top:6px">
                SLIP LAPORAN KEMAJUAN MURID
              </div>
              <div class="slip-meta" style="margin-top:2px">
                {{ penggal | uppercase }} {{ tahun }}
              </div>
            </div>

            <div style="display:grid;grid-template-columns:90px 1fr;gap:6px 12px;
                        margin-bottom:20px;font-size:13.5px">
              <span class="muted">NAMA:</span>
              <b style="color:var(--ink)">{{ s.name | uppercase }}</b>
              <span class="muted">KELAS:</span>
              <b style="color:var(--ink)">{{ s.klass | uppercase }}</b>
            </div>

            <div class="slip-tbl">
              <div class="slip-tr slip-th" style="grid-template-columns:.5fr 2.4fr 1.4fr 1.4fr">
                <span>BIL</span><span>MATA PELAJARAN</span>
                <span style="text-align:center">Markah / Penuh</span>
                <span style="text-align:right">PANGKAT</span>
              </div>
              @for (x of slipSubjek(); track x.nama; let i = $index) {
                <div class="slip-tr" style="grid-template-columns:.5fr 2.4fr 1.4fr 1.4fr">
                  <span class="muted">{{ i + 1 }}</span>
                  <span style="color:var(--ink);font-weight:600">{{ x.nama }}</span>
                  <span style="text-align:center;font-weight:700;color:var(--ink)">
                    {{ x.markah }}.00 / 100.00
                  </span>
                  <span style="text-align:right">
                    <span class="pill" [style.background]="x.bg" [style.color]="x.c">
                      {{ x.pangkat }}
                    </span>
                  </span>
                </div>
              }
            </div>

            <div style="display:flex;justify-content:space-between;font-size:13px;
                        padding:4px 2px 16px;border-bottom:1px solid var(--line);
                        margin-bottom:16px">
              <span class="muted">JUMLAH MATA PELAJARAN: <b style="color:var(--ink)">{{ slipSubjek().length }}</b></span>
              <span class="muted">
                JUMLAH MARKAH: <b style="color:var(--ink)">{{ jumlahMarkah() }} / {{ slipSubjek().length * 100 }}</b>
                &nbsp;·&nbsp; PERATUS: <b style="color:var(--ink)">{{ peratusSubjek() }}</b>
              </span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
              <div>
                <div style="font-size:12px;font-weight:700;color:var(--muted);
                            margin-bottom:6px">ULASAN GURU KELAS</div>
                <div class="slip-note">
                  Menunjukkan perkembangan yang baik. Teruskan usaha.
                </div>
              </div>

              <div>
                @for (k of komponenBerwajaran(); track k.nama) {
                  <div style="display:grid;grid-template-columns:1.5fr .6fr 1fr;
                              gap:8px;font-size:12.5px;padding:3px 0;align-items:center">
                    <span class="muted">{{ k.nama }} ({{ k.wajaran }}%):</span>
                    <span style="text-align:right;font-weight:700;color:var(--ink)">
                      {{ k.nilai }} %
                    </span>
                    <span style="text-align:right;font-weight:700"
                          [style.color]="k.c">{{ k.pangkat }}</span>
                  </div>
                }
                <div style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px;
                            display:grid;grid-template-columns:1.5fr .6fr 1fr;gap:8px;
                            font-size:13px;align-items:center">
                  <span style="font-weight:700;color:var(--ink)">JUMLAH (100%):</span>
                  <span style="text-align:right;font-family:'Sora',sans-serif;
                               font-weight:800;color:#16a34a">{{ jumlahBerwajaran() }} %</span>
                  <span style="text-align:right">
                    @if (pangkatAkhir(); as p) {
                      <span class="pill" [style.background]="p.bg" [style.color]="p.c">
                        {{ p.nama }}
                      </span>
                    }
                  </span>
                </div>
              </div>
            </div>

            <!-- Flex, bukan grid: gaya cetakan menjadikan .cetak-area
                 absolute, dan grid runtuh kepada satu lajur di bawahnya —
                 tiga tandatangan menegak memakan separuh muka surat. -->
            <div class="slip-sign-row">
              <div class="sign-col">IBU / BAPA / PENJAGA</div>
              <div class="sign-col">GURU KELAS<br />{{ guru(s.klass) }}</div>
              <div class="sign-col">GURU BESAR</div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ===== SLIP KELAS ===== -->
    @if (slipKelas()) {
      <div class="mdl-ov">
        <div class="mdl w880">
          <div class="mdl-bar">
            <div>
              <h3>Slip Penilaian Kelas — {{ kelas }}</h3>
              <p>Ringkasan sembilan mata pelajaran · {{ penggal }} {{ tahun }}</p>
            </div>
            <div style="display:flex;gap:8px">
              <button class="b-pri" style="padding:9px 16px;font-size:13px">⬇ Muat Turun Semua</button>
              <button class="mdl-x" (click)="slipKelas.set(false)">&times;</button>
            </div>
          </div>

          <div class="slip-scroll">
            <div class="slip-class-tr slip-class-th">
              <span>Pelajar</span>
              @for (sub of subjekSenarai; track sub.nama) {
                <span style="text-align:center">{{ sub.pendek }}</span>
              }
              <span style="text-align:right">Purata</span>
            </div>

            @for (row of barisKelas(); track row.no) {
              <div class="slip-class-tr">
                <span style="font-weight:600">{{ row.name }}</span>
                @for (m of row.markah; track $index) {
                  <span style="text-align:center;font-weight:700" [style.color]="m.c">
                    {{ m.nilai }}
                  </span>
                }
                <span style="text-align:right">
                  <span class="pill" [style.background]="row.bg" [style.color]="row.c"
                        style="font-family:'Sora',sans-serif;font-weight:800">
                    {{ row.purata }}
                  </span>
                </span>
              </div>
            }

            @if (!barisKelas().length) {
              <div class="empty">Tiada pelajar aktif dalam kelas ini.</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './students.scss'
})
export class StudentAssessmentComponent {
  readonly senaraiKelas   = KELAS.map(k => k.klass);
  readonly subjekSenarai  = SUBJEK;
  readonly penggalSenarai = PENGGAL;
  readonly pangkatSenarai = PANGKAT;
  readonly komponenSenarai = KOMPONEN;

  kelas = KELAS[0].klass;
  subjek = SUBJEK[0].nama;
  penggal = PENGGAL[0];

  readonly tahun = new Date().getFullYear();

  /** Markah 0–100 per pelajar bagi subjek yang sedang dipilih. */
  readonly markah = signal<Record<string, number>>({});

  readonly roster = computed(() =>
    PELAJAR.filter(s => s.klass === this.kelas && s.status === 'Aktif'));

  set(no: string, v: number | null) {
    const baru = { ...this.markah() };
    if (v === null || v === undefined || isNaN(v)) {
      delete baru[no];
    } else {
      baru[no] = Math.max(0, Math.min(100, Math.round(v)));
    }
    this.markah.set(baru);
  }

  pangkat(no: string) {
    const m = this.markah()[no];
    return m === undefined ? null : pangkatBagi(m);
  }

  readonly purata = computed(() => {
    const n = this.roster().map(s => this.markah()[s.no])
                           .filter((v): v is number => v !== undefined);
    if (!n.length) return '—';
    return (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1);
  });

  readonly cemerlang = computed(() =>
    this.roster().filter(s => (this.markah()[s.no] ?? -1) >= 75).length);

  readonly perluBimbingan = computed(() =>
    this.roster().filter(s => {
      const m = this.markah()[s.no];
      return m !== undefined && m < 40;
    }).length);

  // ---------- Slip ----------

  readonly slip = signal<Student | null>(null);
  readonly slipKelas = signal(false);

  bukaSlip(s: Student) { this.slip.set(s); }
  bukaSlipKelas() { this.slipKelas.set(true); }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.slip()) { this.slip.set(null); return; }
    if (this.slipKelas()) this.slipKelas.set(false);
  }

  /**
   * Markah bagi satu subjek.
   *
   * MOCKUP: subjek yang sedang dipilih menggunakan markah sebenar daripada
   * skrin; yang lain dijana DETERMINISTIK daripada nombor pelajar supaya
   * slip kelihatan lengkap dan KEKAL SAMA setiap kali dibuka. Nombor rawak
   * berubah pada setiap render dan slip kelihatan rosak.
   */
  private markahBagi(s: Student, sub: string): number {
    if (sub === this.subjek && this.markah()[s.no] !== undefined) {
      return this.markah()[s.no];
    }
    let h = 0;
    for (const ch of s.no + sub) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return 25 + (h % 66);   // 25–90
  }

  readonly slipSubjek = computed(() => {
    const s = this.slip();
    if (!s) return [];
    return SUBJEK.map(sub => {
      const markah = this.markahBagi(s, sub.nama);
      const p = pangkatBagi(markah);
      return { nama: sub.nama.toUpperCase(), markah, pangkat: p.nama, bg: p.bg, c: p.c };
    });
  });

  readonly jumlahMarkah = computed(() =>
    this.slipSubjek().reduce((a, x) => a + x.markah, 0));

  readonly peratusSubjek = computed(() => {
    const r = this.slipSubjek();
    if (!r.length) return '0.0';
    return (this.jumlahMarkah() / r.length).toFixed(1);
  });

  /**
   * Komponen berwajaran seperti slip sebenar.
   *
   * Subjek menyumbang 40%; hafazan, adab, dan penilaian ibu bapa
   * menyumbang selebihnya. Nilai selain subjek dijana deterministik —
   * sumbernya belum wujud dalam sistem.
   */
  readonly komponenBerwajaran = computed(() => {
    const s = this.slip();
    if (!s) return [];
    return KOMPONEN.map((k, i) => {
      let asas: number;
      if (i === 0) {
        asas = Number(this.peratusSubjek());
      } else {
        let h = 0;
        for (const ch of s.no + k.nama) h = (h * 37 + ch.charCodeAt(0)) % 991;
        asas = 55 + (h % 41);   // 55–95
      }
      const nilai = (asas * k.wajaran) / 100;
      const p = pangkatBagi(asas);
      return { nama: k.nama, wajaran: k.wajaran, nilai: nilai.toFixed(1),
               pangkat: p.nama, c: p.c };
    });
  });

  readonly jumlahBerwajaran = computed(() =>
    this.komponenBerwajaran()
        .reduce((a, k) => a + Number(k.nilai), 0)
        .toFixed(1));

  readonly pangkatAkhir = computed(() => {
    const j = Number(this.jumlahBerwajaran());
    return j ? pangkatBagi(j) : null;
  });

  readonly barisKelas = computed(() =>
    this.roster().map(s => {
      const markah = SUBJEK.map(sub => {
        const nilai = this.markahBagi(s, sub.nama);
        return { nilai, c: pangkatBagi(nilai).c };
      });
      const purata = Math.round(
        markah.reduce((a, x) => a + x.nilai, 0) / markah.length);
      const p = pangkatBagi(purata);
      return { no: s.no, name: s.name, markah, purata, bg: p.bg, c: p.c };
    }));

  /**
   * Cetak slip.
   *
   * window.print() dengan CSS @media print yang menyembunyikan segalanya
   * kecuali slip. Pelayar menawarkan 'Save as PDF' dalam dialog cetakan,
   * jadi satu tindakan melayan kedua-dua butang.
   *
   * PDF sebenar (openhtmltopdf, seperti invois) menyusul bersama backend
   * — menjananya di pelayar bermakna susun atur berbeza daripada apa yang
   * dihantar melalui e-mel nanti.
   */
  cetak() {
    const el = document.querySelector('.cetak-area');
    if (!el) return;

    // Tetingkap berasingan, bukan @media print pada halaman semasa.
    //
    // Pendekatan 'sembunyikan segalanya kecuali slip' rapuh: visibility
    // menyembunyikan elemen tetapi ia MASIH menduduki ruang, jadi portal
    // shell di belakang modal menyumbang tinggi penuh skrin dan menolak
    // muka surat kedua. Menukarnya kepada display:none pula menyembunyikan
    // modal itu sendiri, kerana modal hidup di dalam shell.
    //
    // Mengklon slip ke dokumen kosong menghapuskan seluruh masalah: tiada
    // apa lagi pada halaman itu untuk menyumbang tinggi.
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return;

    const gaya = [...document.querySelectorAll('link[rel="stylesheet"], style')]
      .map(n => n.outerHTML).join('\n');

    // Laluan imej dijadikan mutlak: 'assets/...' relatif tidak bermakna
    // dalam about:blank, dan logo muncul sebagai ikon pecah.
    const html = el.outerHTML.replace(
      /src="(?!https?:|data:)([^"]+)"/g,
      (_m, u) => `src="${new URL(u, document.baseURI).href}"`);

    w.document.write(`<!doctype html><html><head>
      <title>Slip Laporan Kemajuan Murid</title>
      ${gaya}
      <style>
        @page { margin: 12mm; size: A4 portrait; }
        body { margin: 0; background: #fff; font-size: 11.5px;
               font-family: 'Manrope', system-ui, sans-serif; color: #16262f; }
        .cetak-area { padding: 0 !important; }
        .slip-tr { padding: 6px 14px !important; font-size: 11px !important; }
        .slip-th { font-size: 9.5px !important; }
        .pill { font-size: 9.5px !important; padding: 2px 8px !important; }

        /* Gaya komponen Angular menggunakan atribut skop (_ngcontent-xxx)
           yang TIDAK diklon bersama HTML, jadi susun atur flex hilang.
           Peraturan ini ditulis semula tanpa skop. */
        .slip-sign-row {
          display: flex !important; gap: 20px; margin-top: 26px;
          text-align: center; font-size: 10px; color: #6b7f86;
        }
        .slip-sign-row > div {
          flex: 1 1 0 !important; min-width: 0;
          border-top: 1px dotted #dbe3de; padding-top: 6px; line-height: 1.5;
        }

        * { -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important; }
      </style>
    </head><body>${html}</body></html>`);
    w.document.close();

    // Gaya dan imej perlu dimuatkan sebelum cetakan, jika tidak slip
    // dicetak tanpa reka bentuk.
    // Jeda pendek selepas onload: imej dan fon web kadangkala belum
    // selesai apabila onload dicetuskan, dan slip dicetak tanpa logo.
    w.onload = () => setTimeout(() => { w.focus(); w.print(); w.close(); }, 350);
  }

  ini = inisial;
  guru = guruKelas;
}
