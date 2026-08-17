import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PELAJAR, KELAS, inisial } from './students.mock';

type Tanda = 'H' | 'L' | 'A';

/** Kehadiran — MOCKUP. Tanda disimpan dalam memori sahaja. */
@Component({
  selector: 'app-student-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="m-fade">
      <div class="hdr">
        <div>
          <h1>Kehadiran</h1>
          <p>Ambil &amp; semak kehadiran harian mengikut kelas.</p>
        </div>
        <span class="mock-chip">Mockup — data contoh</span>
      </div>

      <div class="toolbar">
        <div>
          <label class="tool-lbl">Tarikh</label>
          <input class="fld" type="date" [(ngModel)]="tarikh" style="width:auto" />
        </div>
        <div>
          <label class="tool-lbl">Kelas</label>
          <select class="fld" [(ngModel)]="kelas" style="width:auto">
            @for (k of senaraiKelas; track k) { <option [value]="k">{{ k }}</option> }
          </select>
        </div>
        <button class="btn soft push" (click)="tandaSemua()">✓ Tanda Semua Hadir</button>
        <button class="btn green">💾 Simpan Kehadiran</button>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-lbl">Hadir</div>
          <div class="stat-val" style="color:#128a41">{{ kira('H') }}</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">Lewat</div>
          <div class="stat-val" style="color:#c26a1f">{{ kira('L') }}</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">Tidak Hadir</div>
          <div class="stat-val" style="color:#d64545">{{ kira('A') }}</div>
        </div>
      </div>

      <div class="tbl">
        <div class="tr th" style="grid-template-columns:1fr 2fr 1.7fr">
          <span>No. Pelajar</span><span>Nama</span>
          <span style="text-align:center">Kehadiran</span>
        </div>

        @for (s of roster(); track s.no) {
          <div class="tr" style="grid-template-columns:1fr 2fr 1.7fr">
            <span class="no">{{ s.no }}</span>
            <span class="nm">
              <span class="ava-sm">{{ ini(s.name) }}</span>{{ s.name }}
            </span>
            <span class="hadir-btns" style="justify-content:center">
              <button [class.on-h]="tanda()[s.no] === 'H'" (click)="set(s.no, 'H')">Hadir</button>
              <button [class.on-l]="tanda()[s.no] === 'L'" (click)="set(s.no, 'L')">Lewat</button>
              <button [class.on-a]="tanda()[s.no] === 'A'" (click)="set(s.no, 'A')">Tidak</button>
            </span>
          </div>
        }

        @if (!roster().length) {
          <div class="empty">Tiada pelajar aktif dalam kelas ini.</div>
        }
      </div>
    </div>
  `,
  styleUrl: './students.scss'
})
export class StudentAttendanceComponent {
  readonly senaraiKelas = KELAS.map(k => k.klass);

  tarikh = new Date().toISOString().slice(0, 10);
  kelas = KELAS[0].klass;

  /** Tanda per pelajar. Kosong bermakna belum diambil. */
  readonly tanda = signal<Record<string, Tanda>>({});

  readonly roster = computed(() =>
    PELAJAR.filter(s => s.klass === this.kelas && s.status === 'Aktif'));

  set(no: string, t: Tanda) {
    this.tanda.set({ ...this.tanda(), [no]: t });
  }

  tandaSemua() {
    const baru: Record<string, Tanda> = { ...this.tanda() };
    for (const s of this.roster()) baru[s.no] = 'H';
    this.tanda.set(baru);
  }

  kira(t: Tanda): number {
    const m = this.tanda();
    return this.roster().filter(s => m[s.no] === t).length;
  }

  ini = inisial;
}
