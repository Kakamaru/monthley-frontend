import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ComplaintsService, ComplaintRow, ComplaintDetail, AduCategory,
  Assignee, AccountOption
} from './complaints.service';
import { ModuleService } from '../../core/services/module.service';
import { ToastService } from '../../core/ui/toast.service';

@Component({
  selector: 'app-complaint-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './complaint-list.component.html',
  styleUrl: '../expenses/expenses.scss'
})
export class ComplaintListComponent {
  private api = inject(ComplaintsService);
  private toast = inject(ToastService);
  readonly modules = inject(ModuleService);

  readonly rows = signal<ComplaintRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly categories = signal<AduCategory[]>([]);
  readonly assignees = signal<Assignee[]>([]);

  // Penapis
  fStatus = 'ALL';
  fCategory: number | null = null;
  fPriority = 'ALL';
  fQ = '';
  fFrom = '';
  fTo = '';

  readonly statusOpts = [
    { k: 'ALL', l: 'Status — Semua' },
    { k: 'NEW', l: 'Baru' },
    { k: 'IN_PROGRESS', l: 'Dalam Proses' },
    { k: 'RESOLVED', l: 'Selesai' },
    { k: 'REOPENED', l: 'Dibuka Semula' }
  ];

  readonly priorityOpts = [
    { k: 'ALL', l: 'Keutamaan — Semua' },
    { k: 'HIGH', l: 'Tinggi' },
    { k: 'MEDIUM', l: 'Sederhana' },
    { k: 'LOW', l: 'Rendah' }
  ];

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  // ---------- Modal balas ----------
  readonly replyOpen = signal(false);
  readonly detail = signal<ComplaintDetail | null>(null);
  rMessage = '';
  rStatus = '';
  rAssignedTo: number | null = null;
  rInternalNote = '';
  rInternal = false;

  // ---------- Modal rekod aduan (kerani) ----------
  readonly newOpen = signal(false);
  nAccountId: number | null = null;
  nAccountSearch = '';
  readonly accountResults = signal<AccountOption[]>([]);
  nCategoryId: number | null = null;
  nSubject = '';
  nDetail = '';
  nPriority = 'MEDIUM';
  nReporterName = '';
  nReporterPhone = '';

  constructor() {
    this.load();
    this.api.categories().subscribe({
      next: c => this.categories.set(c.filter(x => x.active)),
      error: () => {}
    });
    this.api.assignees().subscribe({
      next: a => this.assignees.set(a),
      error: () => {}
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({
      status: this.fStatus, category: this.fCategory, priority: this.fPriority,
      q: this.fQ || null, from: this.fFrom || null, to: this.fTo || null
    }, this.page(), this.size()).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan aduan.');
        this.loading.set(false);
      }
    });
  }

  cari() { this.page.set(0); this.load(); }

  clear() {
    this.fStatus = 'ALL'; this.fCategory = null; this.fPriority = 'ALL';
    this.fQ = ''; this.fFrom = ''; this.fTo = '';
    this.page.set(0); this.load();
  }

  goPage(p: number) {
    if (p < 0 || p >= this.pages()) return;
    this.page.set(p); this.load();
  }

  // ---------- Label ----------

  labelStatus(s: string): string {
    switch (s) {
      case 'NEW': return 'BARU';
      case 'IN_PROGRESS': return 'DALAM PROSES';
      case 'RESOLVED': return 'SELESAI';
      case 'REOPENED': return 'DIBUKA SEMULA';
      default: return s;
    }
  }

  labelPriority(p: string): string {
    switch (p) {
      case 'HIGH': return 'Tinggi';
      case 'MEDIUM': return 'Sederhana';
      case 'LOW': return 'Rendah';
      default: return p;
    }
  }

  bila(iso: string | null): string {
    if (!iso) return '—';
    return iso.replace('T', ' ').slice(0, 16);
  }

  // ---------- Balas ----------

  openReply(r: ComplaintRow) {
    this.detail.set(null);
    this.rMessage = ''; this.rInternalNote = ''; this.rInternal = false;
    this.error.set(null);
    this.replyOpen.set(true);

    this.api.get(r.id).subscribe({
      next: d => {
        this.detail.set(d);
        this.rStatus = d.header.status;
        this.rAssignedTo = d.assignedTo;
        this.rInternalNote = d.internalNote ?? '';
      },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan aduan.');
        this.replyOpen.set(false);
      }
    });
  }

  closeReply() { this.replyOpen.set(false); }

  /**
   * Hantar balasan dan kemas kini status serentak.
   *
   * Satu panggilan kerana itulah cara ia berlaku: SP membalas DAN menukar
   * status. Dua panggilan bermakna aduan yang dibalas tetapi statusnya
   * tidak berubah apabila yang kedua gagal.
   */
  sendReply() {
    const d = this.detail();
    if (!d) return;

    if (!this.rMessage.trim() && this.rStatus === d.header.status
        && this.rAssignedTo === d.assignedTo
        && this.rInternalNote === (d.internalNote ?? '')) {
      this.toast.error('Tiada perubahan untuk disimpan.');
      return;
    }

    this.saving.set(true);
    this.api.reply(d.header.id, {
      message: this.rMessage.trim() || null,
      status: this.rStatus,
      assignedTo: this.rAssignedTo,
      internalNote: this.rInternalNote || null,
      internal: this.rInternal
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.replyOpen.set(false);
        this.toast.success('Aduan dikemas kini.');
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.toast.error(e?.error?.message ?? 'Gagal menyimpan.');
      }
    });
  }

  // ---------- Rekod aduan telefon ----------

  openNew() {
    this.nAccountId = null; this.nAccountSearch = '';
    this.accountResults.set([]);
    this.nCategoryId = null; this.nSubject = ''; this.nDetail = '';
    this.nPriority = 'MEDIUM'; this.nReporterName = ''; this.nReporterPhone = '';
    this.error.set(null);
    this.newOpen.set(true);
  }

  closeNew() { this.newOpen.set(false); }

  searchAccounts() {
    // Menyunting teks selepas memilih membatalkan pilihan: tanpa ini,
    // pengguna menukar nama dan aduan masuk ke akaun yang dipilih tadi.
    this.nAccountId = null;
    const q = this.nAccountSearch.trim();
    if (q.length < 2) { this.accountResults.set([]); return; }
    this.api.accounts(q).subscribe({
      next: p => this.accountResults.set(p.items),
      error: () => this.accountResults.set([])
    });
  }

  pickAccount(a: AccountOption) {
    this.nAccountId = a.id;
    this.nAccountSearch = `${a.no} — ${a.name}`;
    this.accountResults.set([]);
  }

  saveNew() {
    if (!this.nAccountId) { this.error.set('Akaun wajib dipilih.'); return; }
    if (!this.nSubject.trim()) { this.error.set('Tajuk aduan wajib diisi.'); return; }

    this.saving.set(true);
    this.error.set(null);

    this.api.create({
      accountId: this.nAccountId,
      categoryId: this.nCategoryId,
      subject: this.nSubject.trim(),
      detail: this.nDetail || null,
      priority: this.nPriority,
      reporterName: this.nReporterName || null,
      reporterPhone: this.nReporterPhone || null
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.newOpen.set(false);
        this.toast.success('Aduan direkod.');
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.message ?? 'Gagal merekod aduan.');
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.newOpen()) { this.closeNew(); return; }
    if (this.replyOpen()) { this.closeReply(); }
  }

  /**
   * Cetak satu aduan dengan thread maklum balasnya.
   *
   * Nota dalaman DITAPIS: cetakan sering diserahkan kepada kontraktor
   * atau pengadu, dan nota yang tersembunyi di skrin tidak sepatutnya
   * muncul di atas kertas.
   */
  print(r: ComplaintRow) {
    this.api.get(r.id).subscribe({
      next: d => this.cetakDetail(d),
      error: e => this.toast.error(e?.error?.message ?? 'Gagal memuatkan aduan.')
    });
  }

  private cetakDetail(d: ComplaintDetail) {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { this.toast.error('Benarkan pop-up untuk mencetak.'); return; }

    const esc = (v: string | null) => (v ?? '—')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const h = d.header;
    const thread = d.replies
      .filter(x => !x.internal)
      .map(x => `<div class="rp"><div class="rp-h"><b>${esc(x.byName || 'Pengadu')}</b>
                 <span>${this.bila(x.createdAt)}</span></div>
                 <p>${esc(x.message)}</p></div>`)
      .join('') || '<p class="none">Tiada maklum balas.</p>';

    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${esc(h.complaintNo)}</title><style>
body{font-family:Arial,Helvetica,sans-serif;padding:36px;color:#1a2230;font-size:13px}
h1{font-size:19px;margin:0 0 2px}
.no{font-size:14px;font-weight:700;color:#16a34a}
.meta{color:#667;font-size:12.5px;margin-top:4px}
table{width:100%;border-collapse:collapse;margin-top:20px}
th,td{padding:8px 10px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}
th{width:150px;color:#667;font-weight:600}
h2{font-size:14px;margin:26px 0 10px;text-transform:uppercase;letter-spacing:.04em;color:#667}
.rp{border:1px solid #e6ebe7;border-radius:10px;padding:11px 13px;margin-bottom:10px}
.rp-h{display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px}
.rp-h span{color:#94a3a9}
.rp p{margin:0;line-height:1.55}
.none{color:#94a3a9}
.sign{margin-top:60px;display:flex;justify-content:space-between}
.sign div{border-top:1px solid #333;padding-top:6px;width:200px;font-size:11.5px;text-align:center}
</style></head><body>
<div class="no">${esc(h.complaintNo)}</div>
<h1>${esc(h.subject)}</h1>
<div class="meta">Dicetak: ${new Date().toLocaleString('ms-MY')}</div>
<table>
<tr><th>Pengadu</th><td>${esc(h.reporterName || h.accountName)}</td></tr>
<tr><th>Akaun</th><td>${esc(h.accountNo)} — ${esc(h.accountName)}</td></tr>
${d.reporterPhone ? `<tr><th>Telefon</th><td>${esc(d.reporterPhone)}</td></tr>` : ''}
<tr><th>Kategori</th><td>${esc(h.categoryName)}</td></tr>
<tr><th>Keutamaan</th><td>${this.labelPriority(h.priority)}</td></tr>
<tr><th>Status</th><td>${this.labelStatus(h.status)}</td></tr>
<tr><th>Tarikh Aduan</th><td>${this.bila(h.createdAt)}</td></tr>
<tr><th>Ditugaskan</th><td>${esc(h.assignedName)}</td></tr>
</table>
<h2>Butiran</h2>
<p style="line-height:1.6">${esc(d.detail)}</p>
<h2>Maklum Balas</h2>
${thread}
<div class="sign"><div>Disediakan</div><div>Disahkan</div></div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  /**
   * Muat turun senarai sebagai CSV.
   *
   * Dibina dari baris yang SEDANG dipapar — apa yang dilihat itulah yang
   * dimuat turun. Memuat semula semua rekod bermakna fail tidak sepadan
   * dengan penapis di skrin, dan pengguna menyalahkan penapis.
   */
  muatTurun() {
    const rows = this.rows();
    if (!rows.length) { this.toast.error('Tiada rekod untuk dimuat turun.'); return; }

    const q = (v: string | number | null) => {
      const t = String(v ?? '');
      // Petik hanya bila perlu; Excel memaparkan petikan yang tidak
      // diperlukan sebagai sebahagian nilai.
      return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };

    const head = ['No. Aduan', 'Tajuk', 'Pengadu', 'No. Akaun', 'Kategori',
                  'Keutamaan', 'Status', 'Tarikh Aduan', 'Ditugaskan', 'Umur (hari)'];

    const body = rows.map(r => [
      r.complaintNo, r.subject, r.reporterName || r.accountName, r.accountNo,
      r.categoryName || '', this.labelPriority(r.priority),
      this.labelStatus(r.status), this.bila(r.createdAt),
      r.assignedName || '', r.ageDays
    ].map(q).join(','));

    // BOM supaya Excel mengenali UTF-8 — tanpanya nama dengan aksara
    // beraksen menjadi rosak.
    const csv = '\uFEFF' + [head.map(q).join(','), ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `aduan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
