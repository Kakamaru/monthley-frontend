import { Component, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PELAJAR, KELAS, Student, inisial, warnaStatus } from './students.mock';

/** Senarai Pelajar — MOCKUP. Penapisan berjalan atas data contoh. */
@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="m-fade">
      <div class="hdr">
        <div>
          <h1>Senarai Pelajar</h1>
          <p>Daftar, cari &amp; urus rekod pelajar.</p>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <span class="mock-chip">Mockup — data contoh</span>
          <button class="btn green" (click)="bukaTambah()">+ Tambah Pelajar</button>
        </div>
      </div>

      <div class="filters">
        <div class="filter-grid">
          <input class="fld" [(ngModel)]="cari" (ngModelChange)="halaman.set(1)"
                 placeholder="Cari nama / no. pelajar" />
          <select class="fld" [(ngModel)]="kelas" (ngModelChange)="halaman.set(1)">
            <option value="">Semua kelas</option>
            @for (k of senaraiKelas; track k) { <option [value]="k">{{ k }}</option> }
          </select>
          <select class="fld" [(ngModel)]="status" (ngModelChange)="halaman.set(1)">
            <option value="">Semua status</option>
            <option value="Aktif">Aktif</option>
            <option value="Berhenti">Berhenti</option>
            <option value="Tamat Pengajian">Tamat Pengajian</option>
          </select>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-top:14px;gap:14px;flex-wrap:wrap">
          <div class="note">
            ℹ️ Pelajar didaftar melalui modul
            <a routerLink="/portal/accounts" style="color:#2a6fdb;font-weight:800">Akaun</a>
            — rekod pelajar muncul di sini secara automatik untuk dilengkapkan.
          </div>
          <button class="btn dark">⬇ Export Senarai</button>
        </div>
      </div>

      <div class="tbl">
        <div class="tr th" style="grid-template-columns:1fr 1.8fr 1.2fr 1.4fr 1fr 130px">
          <span>No. Pelajar</span><span>Nama</span><span>Kelas</span>
          <span>Penjaga</span>
          <span style="text-align:center">Status</span>
          <span style="text-align:center">Tindakan</span>
        </div>

        @for (s of paparan(); track s.no) {
          <div class="tr" style="grid-template-columns:1fr 1.8fr 1.2fr 1.4fr 1fr 130px">
            <span class="no">{{ s.no }}</span>
            <span class="nm">
              <span class="ava-sm">{{ ini(s.name) }}</span>
              <span>
                <span style="display:block;font-weight:700">{{ s.name }}</span>
                <span class="nm-sub">{{ s.ic }}</span>
              </span>
            </span>
            <span class="muted">{{ s.klass }}</span>
            <span class="muted">
              <span style="display:block">{{ s.guardian }}</span>
              <span class="nm-sub">{{ s.guardianPhone }}</span>
            </span>
            <span style="text-align:center">
              <span class="pill" [style.background]="warna(s.status).bg"
                    [style.color]="warna(s.status).c">{{ s.status }}</span>
            </span>
            <span class="act">
              <button class="pri" title="Profil" (click)="bukaProfil(s)">👁</button>
              <button title="Edit" (click)="bukaEdit(s)">✎</button>
              <button title="Pautkan Akaun Bil">🔗</button>
            </span>
          </div>
        }

        @if (!ditapis().length) {
          <div class="empty">Tiada pelajar sepadan dengan penapis.</div>
        }

        @if (ditapis().length) {
          <div class="pager">
            <span class="pager-lbl">
              {{ dari() }}–{{ hingga() }} daripada {{ ditapis().length }}
            </span>
            <div class="pager-btns">
              <button [disabled]="halaman() === 1" (click)="halaman.set(halaman() - 1)">‹</button>
              @for (n of nomborHalaman(); track n) {
                <button [class.on]="n === halaman()" (click)="halaman.set(n)">{{ n }}</button>
              }
              <button [disabled]="halaman() === jumlahHalaman()"
                      (click)="halaman.set(halaman() + 1)">›</button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- ===== TAMBAH / EDIT PELAJAR ===== -->
    @if (formOpen()) {
      <div class="mdl-ov">
        <div class="mdl w880">
          <div class="mdl-pad">
            <div class="mdl-hdr">
              <h3>{{ f.no ? 'Edit Pelajar' : 'Tambah Pelajar' }}</h3>
              <button class="mdl-x" (click)="tutupForm()">&times;</button>
            </div>

            <div class="sec-lbl">Maklumat Pelajar</div>
            <div class="grid3">
              <div>
                <label class="f-lbl">Nama Penuh <span class="req">*</span></label>
                <input class="f-in" [(ngModel)]="f.name" placeholder="Nama pelajar" />
              </div>
              <div>
                <label class="f-lbl">No. KP / Sijil Lahir <span class="req">*</span></label>
                <input class="f-in" [(ngModel)]="f.ic" placeholder="cth: 120504-10-1123" />
              </div>
              <div>
                <label class="f-lbl">No. Pendaftaran</label>
                <input class="f-in" [(ngModel)]="f.no" readonly placeholder="Auto-jana" />
              </div>
              <div>
                <label class="f-lbl">Darjah <span class="req">*</span></label>
                <select class="f-in" [(ngModel)]="f.form">
                  @for (d of darjah; track d) { <option [value]="d">{{ d }}</option> }
                </select>
              </div>
              <div>
                <label class="f-lbl">Kelas <span class="req">*</span></label>
                <select class="f-in" [(ngModel)]="f.klass">
                  @for (k of senaraiKelas; track k) { <option [value]="k">{{ k }}</option> }
                </select>
              </div>
              <div>
                <label class="f-lbl">Tarikh Lahir</label>
                <input class="f-in" [(ngModel)]="f.dob" placeholder="DD/MM/YYYY" />
              </div>
              <div>
                <label class="f-lbl">Jantina</label>
                <select class="f-in" [(ngModel)]="f.gender">
                  <option value="L">Lelaki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div class="span2">
                <label class="f-lbl">Alamat</label>
                <input class="f-in" [(ngModel)]="f.address" placeholder="Alamat penuh" />
              </div>
            </div>

            <div class="sec-lbl">Penjaga 1 · Bapa / Penjaga Utama</div>
            <div class="grid2" style="grid-template-columns:1fr 1fr 1fr">
              <div>
                <label class="f-lbl">Nama Penjaga 1 <span class="req">*</span></label>
                <input class="f-in" [(ngModel)]="f.guardian" placeholder="Nama bapa / penjaga" />
              </div>
              <div>
                <label class="f-lbl">No. KP <span class="req">*</span></label>
                <input class="f-in" [(ngModel)]="f.g1Ic" placeholder="XXXXXX-XX-XXXX" />
              </div>
              <div>
                <label class="f-lbl">No. Telefon <span class="req">*</span></label>
                <input class="f-in" [(ngModel)]="f.guardianPhone" placeholder="01X-XXXXXXX" />
              </div>
              <div class="span3">
                <label class="f-lbl">Alamat</label>
                <input class="f-in" [(ngModel)]="f.g1Addr" placeholder="Alamat penuh penjaga 1" />
              </div>
            </div>

            <div class="sec-lbl">Penjaga 2 · Ibu / Penjaga Kedua</div>
            <div class="grid2">
              <div>
                <label class="f-lbl">Nama Penjaga 2</label>
                <input class="f-in" [(ngModel)]="f.g2Name" placeholder="Nama ibu / penjaga" />
              </div>
              <div>
                <label class="f-lbl">No. Telefon</label>
                <input class="f-in" [(ngModel)]="f.g2Phone" placeholder="01X-XXXXXXX" />
              </div>
            </div>

            <label class="chk">
              <input type="checkbox" [(ngModel)]="f.g2SameAddr" />
              Alamat sama dengan Penjaga 1
            </label>

            @if (!f.g2SameAddr) {
              <div style="margin-bottom:22px">
                <label class="f-lbl">Alamat Penjaga 2</label>
                <input class="f-in" [(ngModel)]="f.g2Addr" placeholder="Alamat penuh penjaga 2" />
              </div>
            }

            <div class="sec-lbl">Status &amp; Kesihatan</div>
            <div class="grid2" style="grid-template-columns:1fr 2fr">
              <div>
                <label class="f-lbl">Status</label>
                <select class="f-in" [(ngModel)]="f.status">
                  <option value="Aktif">Aktif</option>
                  <option value="Berhenti">Berhenti</option>
                  <option value="Tamat Pengajian">Tamat Pengajian</option>
                </select>
              </div>
              <div>
                <label class="f-lbl">Catatan Kesihatan / Alahan</label>
                <input class="f-in" [(ngModel)]="f.health" placeholder="cth: Alahan kacang" />
              </div>
            </div>

            <div class="mdl-foot">
              <button class="b-ghost" (click)="tutupForm()">Batal</button>
              <button class="b-pri" (click)="tutupForm()">Simpan</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ===== PROFIL PELAJAR ===== -->
    @if (profil(); as s) {
      <div class="mdl-ov">
        <div class="mdl w760">
          <div class="prof-hero">
            <button class="mdl-x" (click)="profil.set(null)">&times;</button>
            <div class="prof-row">
              <div class="prof-ava">{{ ini(s.name) }}</div>
              <div>
                <div class="prof-name">{{ s.name }}</div>
                <div class="prof-sub">{{ s.no }} · {{ s.klass }}</div>
                <span class="pill" style="margin-top:8px;display:inline-block"
                      [style.background]="warna(s.status).bg"
                      [style.color]="warna(s.status).c">{{ s.status }}</span>
              </div>
            </div>
          </div>

          <div style="padding:26px 30px">
            <div class="sec-lbl">Butiran Peribadi</div>
            <div class="grid3">
              <div>
                <div class="kv-lbl">No. KP / Sijil Lahir</div>
                <div class="kv-val">{{ s.ic }}</div>
              </div>
              <div>
                <div class="kv-lbl">Tarikh Lahir</div>
                <div class="kv-val">{{ s.dob }}</div>
              </div>
              <div>
                <div class="kv-lbl">Jantina</div>
                <div class="kv-val">{{ s.gender === 'L' ? 'Lelaki' : 'Perempuan' }}</div>
              </div>
              <div class="span3">
                <div class="kv-lbl">Alamat</div>
                <div class="kv-val">{{ s.address }}</div>
              </div>
              <div>
                <div class="kv-lbl">Tarikh Daftar</div>
                <div class="kv-val">{{ s.enrol }}</div>
              </div>
              <div class="span2">
                <div class="kv-lbl">Catatan Kesihatan</div>
                <div class="kv-val">{{ s.health }}</div>
              </div>
            </div>

            <div class="sec-lbl">Penjaga &amp; Pembilan</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
              <div class="mini-card">
                <div class="kv-lbl" style="margin-bottom:6px">Penjaga</div>
                <div style="font-size:15px;font-weight:700;color:var(--ink)">{{ s.guardian }}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:2px">📞 {{ s.guardianPhone }}</div>
              </div>
              <div class="mini-card">
                <div class="kv-lbl" style="margin-bottom:6px">Akaun Bil Berpaut</div>
                <div style="font-size:15px;font-weight:700;color:#16a34a">🔗 {{ s.billAcct }}</div>
                <div style="font-size:13px;color:var(--muted);margin-top:2px">{{ s.products }}</div>
              </div>
            </div>

            <div class="mdl-foot">
              <button class="b-ghost" (click)="profil.set(null)">Tutup</button>
              <button class="b-dark" (click)="bukaEdit(s)">✎ Edit</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './students.scss'
})
export class StudentListComponent {
  readonly senaraiKelas = KELAS.map(k => k.klass);

  cari = '';
  kelas = '';
  status = '';

  readonly halaman = signal(1);
  private readonly saiz = 8;

  readonly ditapis = computed<Student[]>(() => {
    const q = this.cari.trim().toLowerCase();
    return PELAJAR.filter(s => {
      if (this.kelas && s.klass !== this.kelas) return false;
      if (this.status && s.status !== this.status) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.no.toLowerCase().includes(q);
    });
  });

  readonly jumlahHalaman = computed(() =>
    Math.max(1, Math.ceil(this.ditapis().length / this.saiz)));

  readonly paparan = computed(() => {
    const mula = (this.halaman() - 1) * this.saiz;
    return this.ditapis().slice(mula, mula + this.saiz);
  });

  readonly dari   = computed(() => (this.halaman() - 1) * this.saiz + 1);
  readonly hingga = computed(() =>
    Math.min(this.halaman() * this.saiz, this.ditapis().length));

  readonly nomborHalaman = computed(() =>
    Array.from({ length: this.jumlahHalaman() }, (_, i) => i + 1));

  // ---------- Modal ----------

  readonly darjah = ['Darjah 1', 'Darjah 2', 'Darjah 3',
                     'Darjah 4', 'Darjah 5', 'Darjah 6'];

  readonly formOpen = signal(false);
  readonly profil = signal<Student | null>(null);

  /**
   * Salinan boleh ubah untuk borang.
   *
   * Mengedit objek dari PELAJAR secara terus bermakna 'Batal' tidak
   * membatalkan apa-apa — perubahan sudah masuk ke data sumber.
   */
  f: Partial<Student> = {};

  bukaTambah() {
    this.f = {
      no: '', name: '', ic: '', form: this.darjah[0],
      klass: this.senaraiKelas[0], dob: '', gender: 'L', address: '',
      guardian: '', guardianPhone: '', g1Ic: '', g1Addr: '',
      g2Name: '', g2Phone: '', g2Addr: '', g2SameAddr: true,
      status: 'Aktif', health: ''
    };
    this.profil.set(null);
    this.formOpen.set(true);
  }

  bukaEdit(s: Student) {
    this.f = { ...s, g2SameAddr: s.g2SameAddr ?? true };
    this.profil.set(null);
    this.formOpen.set(true);
  }

  tutupForm() { this.formOpen.set(false); }

  bukaProfil(s: Student) { this.profil.set(s); }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.formOpen()) { this.tutupForm(); return; }
    if (this.profil()) this.profil.set(null);
  }

  ini = inisial;
  warna = warnaStatus;
}
