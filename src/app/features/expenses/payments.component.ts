import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpNoticeComponent } from './module-notice.component';
import { ModuleService } from '../../core/services/module.service';
import {
  ExpensesService, ExpPaymentRow, ExpInvoiceRow, ExpPaymentMethod
} from './expenses.service';

@Component({
  selector: 'app-exp-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, ExpNoticeComponent],
  templateUrl: './payments.component.html',
  styleUrl: './expenses.scss'
})
export class ExpPaymentsComponent {
  private api = inject(ExpensesService);
  readonly modules = inject(ModuleService);

  readonly rows = signal<ExpPaymentRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  q = '';
  from = '';
  to = '';

  readonly methods = signal<ExpPaymentMethod[]>([]);

  // Pemilih invois → borang bayar
  readonly chooserOpen = signal(false);
  readonly openInvoices = signal<ExpInvoiceRow[]>([]);
  chosenInvoiceId: number | null = null;

  readonly payOpen = signal(false);
  readonly payFor = signal<ExpInvoiceRow | null>(null);
  payAmount: number | null = null;
  payDate = new Date().toISOString().slice(0, 10);
  payMethod = '';
  payRefNo = '';
  payNote = '';

  readonly visible = computed(() => {
    const cari = this.q.trim().toLowerCase();
    return this.rows()
      .filter(r => !this.from || r.payDate >= this.from)
      .filter(r => !this.to || r.payDate <= this.to)
      .filter(r => !cari
        || r.pvNo.toLowerCase().includes(cari)
        || r.supplierName.toLowerCase().includes(cari)
        || r.invNo.toLowerCase().includes(cari));
  });

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  constructor() {
    this.load();
    this.api.methods().subscribe({
      next: m => {
        this.methods.set(m.filter(x => x.active));
        if (!this.payMethod && this.methods().length) this.payMethod = this.methods()[0].name;
      },
      error: () => {}
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.payments(this.page(), this.size()).subscribe({
      next: r => {
        this.rows.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan bayaran.');
        this.loading.set(false);
      }
    });
  }

  clearFilter() { this.q = ''; this.from = ''; this.to = ''; }

  goPage(p: number) {
    if (p < 0 || p >= this.pages()) return;
    this.page.set(p); this.load();
  }

  // ---------- Pilih invois ----------

  /**
   * Invois belum selesai dimuatkan dalam DUA panggilan, bukan satu.
   *
   * Endpoint menapis mengikut satu status; tiada 'OPEN' yang bermakna
   * UNPAID atau PARTIAL. Menambah status gabungan pada backend untuk satu
   * skrin bermakna satu lagi nilai yang setiap penapis kena fahami.
   */
  openChooser() {
    this.chosenInvoiceId = null;
    this.error.set(null);
    this.chooserOpen.set(true);
    this.openInvoices.set([]);

    this.api.invoices('UNPAID', 0, 300).subscribe({
      next: a => {
        this.api.invoices('PARTIAL', 0, 300).subscribe({
          next: b => this.openInvoices.set([...a.items, ...b.items]),
          error: () => this.openInvoices.set(a.items)
        });
      },
      error: e => this.error.set(e?.error?.message ?? 'Gagal memuatkan invois.')
    });
  }

  closeChooser() { this.chooserOpen.set(false); }

  proceed() {
    const inv = this.openInvoices().find(i => i.id === this.chosenInvoiceId);
    if (!inv) { this.error.set('Pilih invois dahulu.'); return; }
    this.chooserOpen.set(false);
    this.openPay(inv);
  }

  // ---------- Bayar ----------

  openPay(inv: ExpInvoiceRow) {
    this.payFor.set(inv);
    this.payAmount = inv.balance;
    this.payDate = new Date().toISOString().slice(0, 10);
    this.payRefNo = ''; this.payNote = '';
    if (!this.payMethod && this.methods().length) this.payMethod = this.methods()[0].name;
    this.error.set(null);
    this.payOpen.set(true);
  }

  closePay() { this.payOpen.set(false); }

  pay() {
    const inv = this.payFor();
    if (!inv) return;
    const amt = Number(this.payAmount) || 0;
    if (amt <= 0) { this.error.set('Amaun mesti lebih daripada sifar.'); return; }
    if (amt > inv.balance) {
      this.error.set(`Amaun melebihi baki (RM${inv.balance.toFixed(2)}).`);
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api.pay({
      invoiceId: inv.id,
      payDate: this.payDate,
      amount: amt,
      method: this.payMethod,
      refNo: this.payRefNo || null,
      note: this.payNote || null
    }).subscribe({
      next: () => { this.saving.set(false); this.payOpen.set(false); this.load(); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal merekod bayaran.');
        this.saving.set(false);
      }
    });
  }

  cancel(r: ExpPaymentRow) {
    const reason = prompt(`Batalkan bayaran ${r.pvNo}?\n\nSebab pembatalan:`);
    if (reason === null) return;
    if (!reason.trim()) { this.error.set('Sebab pembatalan diperlukan.'); return; }

    this.api.cancelPayment(r.id, reason.trim()).subscribe({
      next: () => this.load(),
      error: e => this.error.set(e?.error?.message ?? 'Gagal membatalkan bayaran.')
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.payOpen()) { this.closePay(); return; }
    if (this.chooserOpen()) { this.closeChooser(); }
  }

  /**
   * Cetak baucar dalam tetingkap baharu.
   *
   * Dibina sebagai HTML mentah dan bukan komponen Angular: baucar ialah
   * dokumen cetakan berdiri sendiri, dan menyalurkannya melalui penghalaan
   * bermakna gaya portal turut dicetak.
   */
  print(r: ExpPaymentRow) {
    const w = window.open('', '_blank', 'width=720,height=820');
    if (!w) { this.error.set('Benarkan pop-up untuk mencetak.'); return; }

    const esc = (v: string | null) => (v ?? '-')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rm = (n: number) => 'RM ' + n.toFixed(2);

    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${esc(r.pvNo)}</title><style>
body{font-family:Arial,sans-serif;padding:40px;color:#1a2230}
h1{font-size:20px;margin:0 0 4px}
.muted{color:#667;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:24px}
td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left;font-size:14px}
.tot{font-size:18px;font-weight:700}
.sign{margin-top:70px;display:flex;justify-content:space-between}
.sign div{border-top:1px solid #333;padding-top:6px;width:200px;font-size:12px;text-align:center}
</style></head><body>
<h1>BAUCAR BAYARAN (PV)</h1>
<div class="muted">No: <b>${esc(r.pvNo)}</b> · Tarikh: ${esc(r.payDate)}</div>
<table>
<tr><th>Pembekal</th><td>${esc(r.supplierName)}</td></tr>
<tr><th>No Invois</th><td>${esc(r.invNo)}</td></tr>
<tr><th>Kaedah</th><td>${esc(r.method)}</td></tr>
${r.refNo ? `<tr><th>No Rujukan</th><td>${esc(r.refNo)}</td></tr>` : ''}
<tr><th>Jumlah</th><td class="tot">${rm(r.amount)}</td></tr>
</table>
<div class="sign"><div>Disediakan</div><div>Diluluskan</div></div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    w.document.close();
  }
}
