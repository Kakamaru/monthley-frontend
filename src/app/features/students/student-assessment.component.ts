import { Component, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PELAJAR, KELAS, SUBJEK, PENGGAL, TAHAP, Student,
         inisial, guruKelas, tahapBagi } from './students.mock';

/**
 * Penilaian Pelajar (PBD) — MOCKUP.
 *
 * Tahap Penguasaan TP1–TP6 ialah skala rasmi Pentaksiran Bilik Darjah;
 * padanan pangkat Arab mengikut amalan KAFA.
 */
@Component({
  selector: 'app-student-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="m-fade">
      <div class="hdr">
        <div>
          <h1>Penilaian Pelajar (PBD)</h1>
          <p>Pentaksiran Bilik Darjah — Tahap Penguasaan TP1–TP6 mengikut subjek KAFA.</p>
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
          <label class="tool-lbl">Subjek</label>
          <select class="fld" [(ngModel)]="subjek" style="width:auto">
            @for (s of subjekSenarai; track s) { <option [value]="s">{{ s }}</option> }
          </select>
        </div>
        <div>
          <label class="tool-lbl">Penggal</label>
          <select class="fld" [(ngModel)]="penggal" style="width:auto">
            @for (p of penggalSenarai; track p) { <option [value]="p">{{ p }}</option> }
          </select>
        </div>
        <button class="btn green push">💾 Simpan Penilaian</button>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-lbl">Purata Tahap</div>
          <div class="stat-val" style="color:#16a34a">TP {{ purata() }}</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">Menguasai (TP5–6)</div>
          <div class="stat-val" style="color:#0f7a52">{{ menguasai() }}</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">Perlu Bimbingan (TP1–2)</div>
          <div class="stat-val" style="color:#d64545">{{ perluBimbingan() }}</div>
        </div>
      </div>

      <div class="assess-grid">
        <div class="tbl">
          <div class="tr th" style="grid-template-columns:.9fr 1.7fr 1.9fr 1.3fr .7fr">
            <span>No.</span><span>Nama</span>
            <span style="text-align:center">Tahap Penguasaan</span>
            <span style="text-align:right">Pangkat</span>
            <span style="text-align:right">Slip</span>
          </div>

          @for (s of roster(); track s.no) {
            <div class="tr" style="grid-template-columns:.9fr 1.7fr 1.9fr 1.3fr .7fr">
              <span class="no">{{ s.no }}</span>
              <span class="nm">
                <span class="ava-sm">{{ ini(s.name) }}</span>{{ s.name }}
              </span>
              <span class="tp-btns">
                @for (t of tahapSenarai; track t.tp) {
                  <button [class.on]="markah()[s.no] === t.tp"
                          (click)="set(s.no, t.tp)">{{ t.tp }}</button>
                }
              </span>
              <span style="text-align:right">
                @if (pangkat(s.no); as p) {
                  <span class="pill" [style.background]="p.bg" [style.color]="p.c">
                    {{ p.arab }}
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

        <div class="card" style="margin:0">
          <h3 style="margin-bottom:4px">Panduan Tahap Penguasaan</h3>
          <p class="sub" style="margin:0 0 14px">Padanan TP dengan pangkat Arab</p>
          @for (g of tahapSenarai; track g.tp) {
            <div class="legend-tp">
              <span class="tp-chip" [style.background]="g.bg" [style.color]="g.c">
                TP{{ g.tp }}
              </span>
              <div style="min-width:0">
                <div class="legend-arab">{{ g.arab }}</div>
                <div class="legend-desc">{{ g.desc }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ===== SLIP INDIVIDU ===== -->
    @if (slip(); as s) {
      <div class="mdl-ov">
        <div class="mdl w600">
          <div class="mdl-bar">
            <h3>Slip Penilaian PBD</h3>
            <div style="display:flex;gap:8px">
              <button class="b-pri" style="padding:9px 16px;font-size:13px">⬇ PDF</button>
              <button class="mdl-x">🖨</button>
              <button class="mdl-x" (click)="slip.set(null)">&times;</button>
            </div>
          </div>

          <div style="padding:28px 32px">
            <div class="slip-hdr">
              <img src="assets/monthley-badge.png" alt=""
                   style="height:44px;width:44px;border-radius:11px" />
              <div style="flex:1">
                <div class="slip-org">Sekolah Rendah Agama KAFA</div>
                <div class="slip-meta">
                  Slip Pentaksiran Bilik Darjah (PBD) · {{ penggal }} {{ tahun }}
                </div>
              </div>
            </div>

            <div class="slip-kv">
              <div><span>Nama:</span> <b>{{ s.name }}</b></div>
              <div><span>No. Pelajar:</span> <b>{{ s.no }}</b></div>
              <div><span>Kelas:</span> <b>{{ s.klass }} ({{ s.form }})</b></div>
              <div><span>Guru Kelas:</span> <b>{{ guru(s.klass) }}</b></div>
            </div>

            <div class="slip-tbl">
              <div class="slip-tr slip-th">
                <span>Subjek</span>
                <span style="text-align:center">Tahap</span>
                <span style="text-align:right">Pangkat</span>
              </div>
              @for (x of slipSubjek(); track x.sub) {
                <div class="slip-tr">
                  <span style="color:var(--ink);font-weight:600">{{ x.sub }}</span>
                  <span class="slip-tp" [style.color]="x.c">{{ x.tpLbl }}</span>
                  <span style="text-align:right">
                    <span class="pill" [style.background]="x.bg" [style.color]="x.c">
                      {{ x.arab }}
                    </span>
                  </span>
                </div>
              }
            </div>

            <div class="slip-avg">
              <span class="slip-avg-lbl">Purata Tahap Keseluruhan</span>
              <span style="display:flex;align-items:center;gap:10px">
                <span class="slip-avg-val">TP {{ slipPurata() }}</span>
                @if (slipPangkat(); as p) {
                  <span class="pill" [style.background]="p.bg" [style.color]="p.c">
                    {{ p.arab }}
                  </span>
                }
              </span>
            </div>

            <div>
              <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:5px">
                Ulasan Guru
              </div>
              <div class="slip-note">
                Menunjukkan perkembangan yang baik. Teruskan usaha &amp; tingkatkan bacaan.
              </div>
            </div>

            <div class="slip-sign">
              <span>Tandatangan Guru: _______________</span>
              <span>Tarikh: {{ hariIni }}</span>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ===== SLIP KELAS ===== -->
    @if (slipKelas()) {
      <div class="mdl-ov">
        <div class="mdl w820">
          <div class="mdl-bar">
            <div>
              <h3>Slip Penilaian Kelas — {{ kelas }}</h3>
              <p>Ringkasan tahap semua subjek · {{ penggal }} {{ tahun }}</p>
            </div>
            <div style="display:flex;gap:8px">
              <button class="b-pri" style="padding:9px 16px;font-size:13px">⬇ Muat Turun Semua</button>
              <button class="mdl-x" (click)="slipKelas.set(false)">&times;</button>
            </div>
          </div>

          <div class="slip-scroll">
            <div class="slip-class-tr slip-class-th">
              <span>Pelajar</span>
              @for (sub of subjekPendek; track sub) {
                <span style="text-align:center">{{ sub }}</span>
              }
              <span style="text-align:right">Purata</span>
            </div>

            @for (row of barisKelas(); track row.no) {
              <div class="slip-class-tr">
                <span style="font-weight:600">{{ row.name }}</span>
                @for (x of row.tahap; track $index) {
                  <span class="slip-tp" [style.color]="x.c">{{ x.tpLbl }}</span>
                }
                <span style="text-align:right">
                  <span class="pill" [style.background]="row.bg" [style.color]="row.c"
                        style="font-family:'Sora',sans-serif;font-weight:800">
                    TP {{ row.purata }}
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
  readonly senaraiKelas  = KELAS.map(k => k.klass);
  readonly subjekSenarai = SUBJEK;
  readonly penggalSenarai = PENGGAL;
  readonly tahapSenarai  = TAHAP;

  kelas = KELAS[0].klass;
  subjek = SUBJEK[0];
  penggal = PENGGAL[0];

  readonly markah = signal<Record<string, number>>({});

  readonly roster = computed(() =>
    PELAJAR.filter(s => s.klass === this.kelas && s.status === 'Aktif'));

  set(no: string, tp: number) {
    this.markah.set({ ...this.markah(), [no]: tp });
  }

  pangkat(no: string) {
    const tp = this.markah()[no];
    return tp ? TAHAP.find(t => t.tp === tp) : null;
  }

  /** Purata dikira atas pelajar yang SUDAH dinilai sahaja. */
  readonly purata = computed(() => {
    const nilai = this.roster()
      .map(s => this.markah()[s.no])
      .filter((v): v is number => !!v);
    if (!nilai.length) return '—';
    return (nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(1);
  });

  readonly menguasai = computed(() =>
    this.roster().filter(s => (this.markah()[s.no] ?? 0) >= 5).length);

  readonly perluBimbingan = computed(() =>
    this.roster().filter(s => {
      const tp = this.markah()[s.no];
      return tp === 1 || tp === 2;
    }).length);

  // ---------- Slip ----------

  readonly slip = signal<Student | null>(null);
  readonly slipKelas = signal(false);

  readonly tahun = new Date().getFullYear();
  readonly hariIni = new Date().toLocaleDateString('en-GB');

  /** Nama subjek dipendekkan supaya lajur slip kelas muat. */
  readonly subjekPendek = ['Solat', 'Al-Quran', 'Jawi', 'Hafazan', 'Adab'];

  bukaSlip(s: Student) { this.slip.set(s); }
  bukaSlipKelas() { this.slipKelas.set(true); }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.slip()) { this.slip.set(null); return; }
    if (this.slipKelas()) this.slipKelas.set(false);
  }

  /**
   * Markah setiap subjek untuk satu pelajar.
   *
   * MOCKUP: hanya subjek yang sedang dipilih mempunyai markah sebenar
   * daripada skrin; yang lain dijana secara deterministik daripada nombor
   * pelajar supaya slip kelihatan lengkap dan KEKAL SAMA setiap kali
   * dibuka. Nombor rawak akan berubah pada setiap render dan slip
   * kelihatan rosak.
   */
  private markahSubjek(s: Student, sub: string): number {
    if (sub === this.subjek && this.markah()[s.no]) {
      return this.markah()[s.no];
    }
    let h = 0;
    for (const ch of s.no + sub) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return (h % 6) + 1;
  }

  readonly slipSubjek = computed(() => {
    const s = this.slip();
    if (!s) return [];
    return SUBJEK.map(sub => {
      const tp = this.markahSubjek(s, sub);
      const t = tahapBagi(tp)!;
      return { sub, tpLbl: `TP${tp}`, arab: t.arab, bg: t.bg, c: t.c };
    });
  });

  readonly slipPurata = computed(() => {
    const r = this.slipSubjek();
    if (!r.length) return '—';
    const jum = r.reduce((a, x) => a + Number(x.tpLbl.replace('TP', '')), 0);
    return (jum / r.length).toFixed(1);
  });

  readonly slipPangkat = computed(() => {
    const p = this.slipPurata();
    if (p === '—') return null;
    return tahapBagi(Math.round(Number(p)));
  });

  readonly barisKelas = computed(() =>
    this.roster().map(s => {
      const tahap = SUBJEK.map(sub => {
        const tp = this.markahSubjek(s, sub);
        const t = tahapBagi(tp)!;
        return { tpLbl: `TP${tp}`, c: t.c };
      });
      const jum = tahap.reduce((a, x) => a + Number(x.tpLbl.replace('TP', '')), 0);
      const purata = (jum / tahap.length).toFixed(1);
      const t = tahapBagi(Math.round(Number(purata)))!;
      return { no: s.no, name: s.name, tahap, purata, bg: t.bg, c: t.c };
    }));

  ini = inisial;
  guru = guruKelas;
}
