import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PELAJAR, KELAS, inisial, warnaStatus } from './students.mock';

/**
 * Dashboard Pelajar — MOCKUP.
 *
 * Angka dikira daripada data contoh dalam students.mock.ts. Tiada
 * panggilan backend; skrin ini wujud untuk membincangkan bentuk sebelum
 * skema ditetapkan.
 */
@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="m-fade">
      <div class="hdr">
        <div>
          <h1>Dashboard Pelajar</h1>
          <p>Ringkasan enrolmen, taburan darjah &amp; kehadiran.</p>
        </div>
        <span class="mock-chip">Mockup — data contoh</span>
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="kpi-ic" style="background:#e8eefb">🎓</div>
          <div class="kpi-lbl">Jumlah Pelajar</div>
          <div class="kpi-val">{{ jumlah() }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-top">
            <div class="kpi-ic" style="background:#e7f6ec">✅</div>
            <span class="pill ok">Aktif</span>
          </div>
          <div class="kpi-lbl">Pelajar Aktif</div>
          <div class="kpi-val" style="color:#16a34a">{{ aktif() }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-ic" style="background:#fdecec">🚪</div>
          <div class="kpi-lbl">Berhenti</div>
          <div class="kpi-val" style="color:#d64545">{{ berhenti() }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-ic" style="background:#eef4ff">🎉</div>
          <div class="kpi-lbl">Tamat Pengajian</div>
          <div class="kpi-val" style="color:#2a6fdb">{{ tamat() }}</div>
        </div>
      </div>

      <div class="two">
        <div class="card">
          <h3>Taburan Ikut Darjah</h3>
          <div class="donut-row">
            <div class="donut" [style.background]="donut()">
              <div class="donut-hole">
                <div class="donut-lbl">Jumlah</div>
                <div class="donut-val">{{ jumlah() }}</div>
              </div>
            </div>
            <div class="legend">
              @for (f of taburan(); track f.label) {
                <div class="legend-row">
                  <span class="dot" [style.background]="f.color"></span>
                  <span class="legend-lbl">{{ f.label }}</span>
                  <span class="legend-n">{{ f.count }}</span>
                  <span class="legend-pct">{{ f.pct }}%</span>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Kehadiran Minggu Ini</h3>
          <p class="sub">Purata % hadir harian</p>
          <div class="bars">
            @for (b of kehadiran; track b.d) {
              <div class="bar-col">
                <div class="bar-pct">{{ b.pct }}</div>
                <div class="bar" [style.height.%]="b.pct"></div>
                <div class="bar-d">{{ b.d }}</div>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hdr">
          <h3>Pendaftaran Terkini</h3>
          <a routerLink="/portal/students/list">Lihat semua</a>
        </div>
        @for (s of terkini(); track s.no) {
          <div class="row">
            <span class="ava">{{ ini(s.name) }}</span>
            <span class="row-main">
              <span class="row-name">{{ s.name }}</span>
              <span class="row-sub">{{ s.no }} · {{ s.klass }}</span>
            </span>
            <span class="pill"
                  [style.background]="warna(s.status).bg"
                  [style.color]="warna(s.status).c">{{ s.status }}</span>
            <span class="row-date">Daftar {{ s.enrol }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './students.scss'
})
export class StudentDashboardComponent {
  private readonly semua = signal(PELAJAR);

  readonly jumlah    = computed(() => this.semua().length);
  readonly aktif     = computed(() => this.semua().filter(s => s.status === 'Aktif').length);
  readonly berhenti  = computed(() => this.semua().filter(s => s.status === 'Berhenti').length);
  readonly tamat     = computed(() => this.semua().filter(s => s.status === 'Tamat Pengajian').length);

  readonly kehadiran = [
    { d: 'Isn', pct: 94 }, { d: 'Sel', pct: 91 }, { d: 'Rab', pct: 96 },
    { d: 'Kha', pct: 89 }, { d: 'Jum', pct: 93 }, { d: 'Sab', pct: 87 },
    { d: 'Ahd', pct: 90 }
  ];

  private readonly WARNA = ['#16a34a', '#2a6fdb', '#bcd634', '#c26a1f', '#8b5cf6', '#0f7a52'];

  readonly taburan = computed(() => {
    const kira = new Map<string, number>();
    for (const s of this.semua()) {
      kira.set(s.form, (kira.get(s.form) ?? 0) + 1);
    }
    const jum = this.semua().length || 1;
    return [...kira.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count], i) => ({
        label, count,
        pct: Math.round((count / jum) * 100),
        color: this.WARNA[i % this.WARNA.length]
      }));
  });

  /** conic-gradient dibina daripada taburan — satu segmen setiap darjah. */
  readonly donut = computed(() => {
    let mula = 0;
    const seg = this.taburan().map(f => {
      const tamat = mula + f.pct;
      const s = `${f.color} ${mula}% ${tamat}%`;
      mula = tamat;
      return s;
    });
    return `conic-gradient(${seg.join(',')})`;
  });

  readonly terkini = computed(() =>
    [...this.semua()]
      .sort((a, b) => b.enrol.localeCompare(a.enrol))
      .slice(0, 5));

  ini = inisial;
  warna = warnaStatus;
}
