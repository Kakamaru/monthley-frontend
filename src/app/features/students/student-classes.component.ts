import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KELAS } from './students.mock';

/** Kelas & Darjah — MOCKUP. */
@Component({
  selector: 'app-student-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="m-fade">
      <div class="hdr">
        <div>
          <h1>Kelas &amp; Darjah</h1>
          <p>Struktur kelas, guru kelas &amp; kapasiti.</p>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <span class="mock-chip">Mockup — data contoh</span>
          <button class="btn green" (click)="buka()">+ Tambah Kelas</button>
        </div>
      </div>

      <div class="klas-grid">
        @for (c of kelas; track c.klass) {
          <div class="card" style="margin:0">
            <div class="klas-hdr">
              <div class="klas-room">{{ c.room }}</div>
              <span class="klas-form">{{ c.form }}</span>
            </div>
            <h3 class="klas-name">{{ c.klass }}</h3>
            <div class="klas-teacher">🧑‍🏫 {{ c.teacher }}</div>
            <div class="klas-cap">
              <span>Pelajar</span>
              <span><b>{{ c.count }} / {{ c.cap }}</b></span>
            </div>
            <div class="klas-bar">
              <div class="klas-fill" [style.width.%]="peratus(c.count, c.cap)"></div>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- ===== TAMBAH KELAS ===== -->
    @if (open()) {
      <div class="mdl-ov">
        <div class="mdl w520">
          <div class="mdl-pad">
            <div class="mdl-hdr">
              <h3>Tambah Kelas</h3>
              <button class="mdl-x" (click)="tutup()">&times;</button>
            </div>

            <div class="grid2" style="margin-bottom:0">
              <div>
                <label class="f-lbl">Darjah <span class="req">*</span></label>
                <select class="f-in" [(ngModel)]="f.form">
                  @for (d of darjah; track d) { <option [value]="d">{{ d }}</option> }
                </select>
              </div>
              <div>
                <label class="f-lbl">Nama Kelas <span class="req">*</span></label>
                <input class="f-in" [(ngModel)]="f.nama" placeholder="cth: Amanah" />
              </div>
              <div class="span2">
                <label class="f-lbl">Guru Kelas <span class="req">*</span></label>
                <input class="f-in" [(ngModel)]="f.teacher" placeholder="cth: Pn. Halimah Saadiah" />
              </div>
              <div>
                <label class="f-lbl">Bilik / Kelas</label>
                <input class="f-in" [(ngModel)]="f.room" placeholder="cth: BK-12" />
              </div>
              <div>
                <label class="f-lbl">Kapasiti</label>
                <input class="f-in" type="number" min="1" [(ngModel)]="f.cap" />
              </div>
            </div>

            <div class="mdl-foot">
              <button class="b-ghost" (click)="tutup()">Batal</button>
              <button class="b-pri" (click)="tutup()">Simpan Kelas</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './students.scss'
})
export class StudentClassesComponent {
  readonly kelas = KELAS;

  peratus(count: number, cap: number): number {
    if (!cap) return 0;
    return Math.min(100, Math.round((count / cap) * 100));
  }

  // ---------- Modal ----------

  readonly darjah = ['Darjah 1', 'Darjah 2', 'Darjah 3',
                     'Darjah 4', 'Darjah 5', 'Darjah 6'];

  readonly open = signal(false);

  f = { form: 'Darjah 1', nama: '', teacher: '', room: '', cap: 35 };

  buka() {
    this.f = { form: this.darjah[0], nama: '', teacher: '', room: '', cap: 35 };
    this.open.set(true);
  }

  tutup() { this.open.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.open()) this.tutup(); }
}
