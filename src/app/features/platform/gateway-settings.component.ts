import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

/**
 * Tetapan gerbang bayaran — superadmin sahaja.
 *
 * SP TIDAK melihat skrin ini dan tidak tahu gerbang mana yang digunakan.
 * Kunci milik Rapidevelop; SP hanya melihat bayaran masuk ke akaun mereka.
 *
 * Kunci rahsia TIDAK PERNAH dipulangkan oleh API — skrin hanya tahu sama
 * ada kunci wujud. Medan kunci yang dibiarkan kosong bermakna 'jangan
 * sentuh', supaya menukar kadar yuran tidak memerlukan kunci ditaip
 * semula setiap kali.
 */
interface GatewaySetting {
  spCode: string; spName: string; gateway: string;
  categoryCode: string | null; sandbox: boolean;
  onlinePayment: boolean; keySet: boolean;
  absorb: boolean;
  rateSingle: number | null; rateMulti: number | null;
  minAmount: number | null;
}

@Component({
  selector: 'app-gateway-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gateway-settings.component.html',
  styleUrl: './gateway-settings.component.scss'
})
export class GatewaySettingsComponent {
  private http = inject(HttpClient);
  private base = '/api/v1/platform/gateway';

  readonly rows = signal<GatewaySetting[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal<string | null>(null);

  readonly editOpen = signal(false);
  readonly editing = signal<GatewaySetting | null>(null);

  fGateway = 'TP';
  fSecretKey = '';
  fCategoryCode = '';
  fSandbox = true;
  fOnline = true;
  fAbsorb = false;
  fRateSingle: number | null = null;
  fRateMulti: number | null = null;
  fMinAmount: number | null = null;

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<GatewaySetting[]>(this.base).subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Gagal memuatkan tetapan.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Label medan kedua berbeza mengikut gerbang.
   *
   * ToyyibPay memanggilnya Category Code (kategori bil di bawah akaun);
   * MonthleyPay memanggilnya Merchant Code (MY00000004). Ia lajur yang
   * sama dalam pangkalan data kerana peranannya sama — pengenal akaun di
   * pihak gerbang — tetapi memaparkan label yang salah bermakna superadmin
   * mencari nilai yang tidak wujud dalam papan pemuka gerbang.
   */
  labelKod(): string {
    return this.fGateway === 'MP' ? 'Kod Merchant' : 'Kod Kategori';
  }

  hintKod(): string {
    return this.fGateway === 'MP'
      ? 'Merchant code pada MonthleyPay (cth: MY00000004)'
      : 'Category code pada akaun ToyyibPay';
  }

  labelGateway(kod: string): string {
    switch (kod) {
      case 'TP': return 'ToyyibPay';
      case 'MP': return 'MonthleyPay';
      default: return kod;
    }
  }

  openEdit(r: GatewaySetting) {
    this.editing.set(r);
    this.fGateway = r.gateway || 'TP';
    this.fSecretKey = '';            // sengaja kosong
    this.fCategoryCode = r.categoryCode ?? '';
    this.fSandbox = r.sandbox;
    this.fOnline = r.onlinePayment;
    this.fAbsorb = r.absorb;
    this.fRateSingle = r.rateSingle;
    this.fRateMulti = r.rateMulti;
    this.fMinAmount = r.minAmount;
    this.error.set(null);
    this.editOpen.set(true);
  }

  close() { this.editOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.editOpen()) this.close(); }

  save() {
    const r = this.editing();
    if (!r) return;

    // Kunci baharu memerlukan kod kategori bersamanya — kedua-duanya
    // datang daripada akaun gerbang yang sama.
    if (this.fSecretKey.trim() && !this.fCategoryCode.trim()) {
      this.error.set(`${this.labelKod()} wajib diisi bersama kunci rahsia.`);
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.http.put(`${this.base}/${r.spCode}`, {
      gateway: this.fGateway,
      secretKey: this.fSecretKey.trim() || null,
      categoryCode: this.fCategoryCode.trim() || null,
      sandbox: this.fSandbox,
      onlinePayment: this.fOnline,
      absorb: this.fAbsorb,
      rateSingle: this.fRateSingle,
      rateMulti: this.fRateMulti,
      minAmount: this.fMinAmount
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editOpen.set(false);
        this.ok.set(`Tetapan ${r.spCode} disimpan.`);
        setTimeout(() => this.ok.set(null), 4000);
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.message ?? 'Gagal menyimpan.');
      }
    });
  }
}
