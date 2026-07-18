import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OnboardService, ServicePlan, OnboardResult, BusinessType } from './onboard.service';

@Component({
  selector: 'app-onboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboard.component.html'
})
export class OnboardComponent {
  private api = inject(OnboardService);

  readonly plans = signal<ServicePlan[]>([]);
  readonly bizTypes = signal<BusinessType[]>([]);
  readonly busy = signal(false);
  readonly keyBusy = signal(false);
  readonly result = signal<OnboardResult | null>(null);
  readonly error = signal<string | null>(null);

  // maklumat SP
  name = ''; businessType = ''; registrationNo = ''; businessDesc = ''; website = '';
  addrLine1 = ''; addrLine2 = ''; city = ''; postcode = '';
  state = ''; country = 'Malaysia'; orgRegisteredDate = '';
  servicePlanId: number | null = null;
  billingPlan: 'MONTHLY' | 'YEARLY' = 'MONTHLY';
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
    const p = this.plans().find(x => x.id === this.servicePlanId);
    if (!p) return null;
    return this.billingPlan === 'YEARLY'
      ? { amount: p.priceYearly, unit: 'tahun', limit: p.accountLimit }
      : { amount: p.priceMonthly, unit: 'bulan', limit: p.accountLimit };
  });

  constructor() {
    this.api.plans().subscribe({
      next: p => this.plans.set(p),
      error: () => this.plans.set([])
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
      servicePlanId: this.servicePlanId, billingPlan: this.billingPlan,
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
