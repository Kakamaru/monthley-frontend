import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OnboardService, PlanOption, CatalogItem, OnboardResult, BusinessType } from './onboard.service';

@Component({
  selector: 'app-onboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboard.component.html'
})
export class OnboardComponent {
  private api = inject(OnboardService);

  readonly plans = signal<PlanOption[]>([]);
  readonly catalog = signal<CatalogItem[]>([]);

  /** Accordion: seksyen mana terbuka. Semua terbuka pada mulanya. */
  readonly buka = signal<Record<string, boolean>>({
    sp: true, pakej: true, kontak: true, bayar: true
  });
  toggle(k: string) {
    this.buka.update(b => ({ ...b, [k]: !b[k] }));
  }

  /** Produk BASIC bukan pelan — onboarding, migrasi. Boleh ditick. */
  readonly itemAsas = computed(() =>
    this.catalog().filter(c => c.category === 'BASIC' && c.accountLimit === null));

  /**
   * Modul tambahan — dipaparkan tetapi BELUM boleh ditick.
   * Menick modul mencipta langganan (bil) tanpa sp_module (hak): SP dibil
   * untuk modul yang tidak boleh diguna. Dibuka bila sp_module wujud.
   */
  readonly modulTambahan = computed(() =>
    this.catalog().filter(c => c.category === 'ADDITIONAL MODUL'));

  readonly pilihanExtra = signal<Set<number>>(new Set());
  togglePilihan(id: number) {
    this.pilihanExtra.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  dipilih(id: number) { return this.pilihanExtra().has(id); }
  readonly bizTypes = signal<BusinessType[]>([]);
  readonly busy = signal(false);
  readonly keyBusy = signal(false);
  readonly result = signal<OnboardResult | null>(null);
  readonly error = signal<string | null>(null);

  // maklumat SP
  name = ''; businessType = ''; registrationNo = ''; businessDesc = ''; website = '';
  addrLine1 = ''; addrLine2 = ''; city = ''; postcode = '';
  state = ''; country = 'Malaysia'; orgRegisteredDate = '';
  planProductId: number | null = null;
  accountNo = '';
  estInvoicesMonth: number | null = null;

  // orang perhubungan
  contactName = ''; adminEmail = ''; contactPhone = '';

  // pembayaran
  absorb = false;
  merchantId = ''; gatewayKey = '';

  // bank
  bankName = ''; bankAccountNo = ''; bankAccountName = '';

  readonly negeri = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
    'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
    'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'
  ];

  /** Harga pakej terpilih ikut pelan bayaran */
  readonly planPrice = computed(() => {
    const p = this.plans().find(x => x.id === this.planProductId);
    if (!p) return null;
    // Semua pelan SP adalah bulanan (ADR 0016). SP yang mahu dibil setahun
    // sekali diuruskan pada peringkat langganan, bukan di sini.
    return { amount: p.price, unit: 'bulan', limit: p.accountLimit };
  });

  constructor() {
    this.api.plans().subscribe({
      next: p => this.plans.set(p),
      error: () => this.plans.set([])
    });
    this.api.catalog().subscribe({
      next: c => this.catalog.set(c),
      error: () => this.catalog.set([])
    });
    this.api.businessTypes().subscribe({
      next: b => this.bizTypes.set(b),
      error: () => this.bizTypes.set([])
    });
  }

  generateKey() {
    this.keyBusy.set(true);
    this.api.generateKey().subscribe({
      next: k => {
        this.merchantId = k.merchantId;
        this.gatewayKey = k.gatewayKey;
        this.keyBusy.set(false);
      },
      error: () => this.keyBusy.set(false)
    });
  }

  submit() {
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    this.api.onboard({
      name: this.name, businessType: this.businessType || undefined,
      registrationNo: this.registrationNo,
      businessDesc: this.businessDesc, website: this.website,
      addrLine1: this.addrLine1, addrLine2: this.addrLine2, city: this.city,
      postcode: this.postcode, state: this.state, country: this.country,
      orgRegisteredDate: this.orgRegisteredDate || undefined,
      planProductId: this.planProductId,
      accountNo: this.accountNo.trim(),
      extraProductIds: [...this.pilihanExtra()],
      estInvoicesMonth: this.estInvoicesMonth,
      contactName: this.contactName, adminEmail: this.adminEmail,
      contactPhone: this.contactPhone,
      absorb: this.absorb, merchantId: this.merchantId, gatewayKey: this.gatewayKey,
      bankName: this.bankName, bankAccountNo: this.bankAccountNo,
      bankAccountName: this.bankAccountName
    }).subscribe({
      next: r => { this.result.set(r); this.busy.set(false); window.scrollTo(0, 0); },
      error: e => {
        this.error.set(e?.error?.message ?? 'Onboarding gagal. Semak maklumat.');
        this.busy.set(false);
        window.scrollTo(0, 0);
      }
    });
  }
}
