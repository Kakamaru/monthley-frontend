import { Component, computed, inject, signal, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Account } from '../../core/models/account.model';
import { AccountsService } from './accounts.service';
import { ProductsService, ProductCategory } from '../products/products.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss'
})
export class AccountsComponent {
  private api = inject(AccountsService);
  private catalog = inject(ProductsService);

  /** grid columns — sama dengan prototaip */
  readonly cols = '1fr 1.6fr 1.6fr 1.1fr 150px';

  readonly activeTab = signal(true);
  readonly searchOpen = signal(false);
  readonly rows = signal<Account[]>([]);
  readonly categories = signal<{ id: number; code: string; name: string }[]>([]);
  readonly products = signal<Product[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  fAccount = '';
  fName = '';
  fCategory: number | null = null;
  fBalFrom = '';
  fBalTo = '';
  fLinked: '' | 'true' | 'false' = '';
  fProdCategory: number | null = null;
  fProduct: number | null = null;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => {
    const t = this.total();
    const from = t ? this.page() * this.size() + 1 : 0;
    const to = Math.min(this.page() * this.size() + this.size(), t);
    return `Menunjukkan ${from}–${to} daripada ${t}`;
  });

  // ── Borang Add Account ──
  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly editAccountNo = signal('');
  readonly editBalance = signal(0);
  // Subscription sedia ada semasa edit: id -> { productId, code, name, quantity, startDate, endDate, unitPrice, frequency, rate, deleted }
  editSubs: any[] = [];
  readonly saving = signal(false);
  readonly cityHints = signal<string[]>([]);
  readonly billtoCityHints = signal<string[]>([]);

  draft = this.blankDraft();

  // Checkbox "alamat billing sama dengan alamat akaun"
  sameAsAccount = false;

  // Langganan produk: productId -> { checked, quantity, startDate, endDate, unitPrice }
  subLines: Record<number, { checked: boolean; quantity: number; startDate: string; endDate: string; unitPrice: number | null }> = {};

  // ralat validasi
  readonly emailErr = signal<string | null>(null);
  readonly allowPriceOverride = signal(true);

  private blankDraft() {
    return {
      // Akaun
      accountNo: '', accountName: '', categoryId: null as number | null,
      depositAmount: 0, chargeFrequency: 'MONTHLY', startDate: '',
      accountType: '',
      // Alamat akaun (untuk checkbox "sama")
      addrLine1: '', addrLine2: '', addrLine3: '', addrLine4: '',
      addrPostcode: '', addrState: '', addrCountry: 'MY',
      // Billing
      billtoName: '', billtoEmail: '', billtoEmailSecondary: '', billtoMobile: '',
      billtoAddrLine1: '', billtoAddrLine2: '', billtoAddrLine3: '', billtoAddrLine4: '',
      billtoPostcode: '', billtoState: '', billtoCountry: 'MY',
      memberIdNo: '', openingAmount: 0, remarks: ''
    };
  }

  readonly freqOptions = [
    { value: 'ONE_TIME', label: 'One Time' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'HALF_YEAR', label: 'Half Yearly' },
    { value: 'YEAR', label: 'Yearly' },
    { value: 'PER_USE', label: 'Per Use' }
  ];

  openAdd() {
    this.draft = this.blankDraft();
    this.sameAsAccount = false;
    this.subLines = {};
    this.emailErr.set(null);
    this.api.config().subscribe({
      next: c => this.allowPriceOverride.set(c.allowPriceOverride),
      error: () => this.allowPriceOverride.set(true)
    });
    this.cityHints.set([]);
    this.billtoCityHints.set([]);
    this.formOpen.set(true);
  }

  openEdit(row: any) {
    this.editingId.set(row.id);
    this.editAccountNo.set(row.no);
    this.editBalance.set(row.balance ?? 0);
    this.error.set(null);
    this.emailErr.set(null);
    this.sameAsAccount = false;
    this.subLines = {};
    this.editSubs = [];
    // Muat config (allowPriceOverride) + data akaun
    this.api.config().subscribe({
      next: c => this.allowPriceOverride.set(c.allowPriceOverride),
      error: () => this.allowPriceOverride.set(true)
    });
    this.api.getOne(row.id).subscribe({
      next: d => {
        this.draft = {
          accountNo: d.accountNo, accountName: d.accountName,
          categoryId: d.categoryId, depositAmount: d.depositAmount ?? 0,
          chargeFrequency: d.chargeFrequency || 'MONTHLY', startDate: d.startDate || '',
          accountType: d.accountType || '',
          addrLine1: d.addrLine1 || '', addrLine2: d.addrLine2 || '',
          addrLine3: d.addrLine3 || '', addrLine4: d.addrLine4 || '',
          addrPostcode: d.addrPostcode || '', addrState: d.addrState || '', addrCountry: d.addrCountry || 'MY',
          billtoName: d.billtoName || '', billtoEmail: d.billtoEmail || '',
          billtoEmailSecondary: d.billtoEmailSecondary || '', billtoMobile: d.billtoMobile || '',
          billtoAddrLine1: d.billtoAddrLine1 || '', billtoAddrLine2: d.billtoAddrLine2 || '',
          billtoAddrLine3: d.billtoAddrLine3 || '', billtoAddrLine4: d.billtoAddrLine4 || '',
          billtoPostcode: d.billtoPostcode || '', billtoState: d.billtoState || '', billtoCountry: d.billtoCountry || 'MY',
          memberIdNo: d.memberIdNo || '', openingAmount: d.openingAmount ?? 0, remarks: d.remarks || ''
        };
        this.editStatus.set(d.status || 'ACTIVE');
        this.linkedEmail.set(d.linkedEmail || null);
        this.linkPanelOpen.set(false);
        this.linkEmail = '';
        this.linkFoundName.set(null);
        this.linkNotFound.set(false);
        this.linkMsg.set(null);
        // subscription sedia ada
        this.editSubs = (d.subscriptions || []).map((s: any) => ({
          id: s.id, productId: s.productId, code: s.code, name: s.name,
          quantity: Number(s.quantity) || 1,
          startDate: s.startDate || '', endDate: s.endDate || '',
          unitPrice: s.unitPrice != null ? Number(s.unitPrice) : Number(s.rate),
          frequency: s.frequency, rate: Number(s.rate), deleted: false
        }));
        this.formOpen.set(true);
      },
      error: () => this.error.set('Gagal memuatkan akaun.')
    });
  }

  readonly editStatus = signal<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  // ── Link/Invite User ──
  readonly linkedEmail = signal<string | null>(null);
  readonly linkPanelOpen = signal(false);
  linkEmail = '';
  readonly linkChecking = signal(false);
  readonly linkFoundName = signal<string | null>(null);
  readonly linkNotFound = signal(false);
  readonly linkMsg = signal<string | null>(null);

  // ── More menu (dropdown per akaun) ──
  readonly moreMenuFor = signal<number | null>(null);

  // ── Add Subscription (More menu) ──
  readonly subModalOpen = signal(false);
  readonly subAccountId = signal<number | null>(null);
  readonly subAccountNo = signal('');
  readonly subSaving = signal(false);
  readonly subError = signal<string | null>(null);
  // produk belum dilanggan (untuk pilih)
  readonly subAvailable = signal<any[]>([]);
  // pilihan: productId -> { checked, quantity, startDate, endDate, unitPrice }
  subPick: Record<number, { checked: boolean; quantity: number; startDate: string; endDate: string; unitPrice: number | null }> = {};
  toggleMore(id: number, ev: Event) {
    ev.stopPropagation();
    this.moreMenuFor.set(this.moreMenuFor() === id ? null : id);
  }
  closeMore() { this.moreMenuFor.set(null); }

  // Placeholder — fungsi sebenar dibina kemudian
  onAdjustment(a: any)   { this.closeMore(); alert('Adjust Account — akan datang (akaun ' + a.no + ')'); }
  onAddSubscription(a: any) {
    this.closeMore();
    this.subAccountId.set(a.id);
    this.subAccountNo.set(a.no);
    this.subError.set(null);
    this.subPick = {};
    this.subAvailable.set([]);
    // Load config (override) + subscription sedia ada + produk
    this.api.config().subscribe({ next: c => this.allowPriceOverride.set(c.allowPriceOverride), error: () => {} });
    this.api.getOne(a.id).subscribe({
      next: d => {
        const subscribed = new Set((d.subscriptions || []).map((s: any) => s.productId));
        // products() dah dimuat (dari openAdd/global). Tapis belum dilanggan.
        const avail = this.products().filter(p => !subscribed.has(p.id));
        this.subAvailable.set(avail);
        this.subModalOpen.set(true);
      },
      error: () => this.subError.set('Gagal memuatkan langganan.')
    });
  }

  closeSubModal() { this.subModalOpen.set(false); this.subAccountId.set(null); }

  subToggle(prod: any) {
    const cur = this.subPick[prod.id];
    if (cur?.checked) {
      this.subPick[prod.id] = { ...cur, checked: false };
    } else {
      this.subPick[prod.id] = { checked: true, quantity: 1, startDate: '', endDate: '', unitPrice: prod.rate };
    }
  }
  subIsChecked(id: number): boolean { return !!this.subPick[id]?.checked; }
  subAmount(prod: any): number {
    const p = this.subPick[prod.id];
    if (!p?.checked) return 0;
    const price = this.allowPriceOverride() ? (p.unitPrice ?? prod.rate) : prod.rate;
    return (p.quantity || 0) * price;
  }

  saveAddSub() {
    const lines = Object.entries(this.subPick)
      .filter(([, v]) => v.checked)
      .map(([pid, v]) => ({
        productId: Number(pid),
        quantity: v.quantity || 1,
        startDate: v.startDate || null,
        endDate: v.endDate || null,
        unitPrice: v.unitPrice
      }));
    if (lines.length === 0) { this.subError.set('Pilih sekurang-kurangnya satu produk.'); return; }
    this.subSaving.set(true);
    this.api.addSubscriptions(this.subAccountId()!, lines).subscribe({
      next: () => { this.subSaving.set(false); this.subModalOpen.set(false); this.load(); },
      error: e => { this.subSaving.set(false); this.subError.set(e?.error?.message || 'Gagal menambah langganan.'); }
    });
  }
  onViewReportPayment(a: any) { this.closeMore(); alert('View Report Payment — akan datang (akaun ' + a.no + ')'); }
  onGenerateInvoice(a: any) { this.closeMore(); alert('Generate Single Invoice — akan datang (akaun ' + a.no + ')'); }
  isEdit(): boolean { return this.editingId() !== null; }

  openLinkPanel() {
    this.linkPanelOpen.set(true);
    this.linkEmail = '';
    this.linkFoundName.set(null);
    this.linkNotFound.set(false);
    this.linkMsg.set(null);
  }
  closeLinkPanel() { this.linkPanelOpen.set(false); }

  // Cari email berdaftar -> tunjuk nama untuk confirm
  checkLinkEmail() {
    const e = (this.linkEmail || '').trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      this.linkMsg.set('Email tidak sah.');
      return;
    }
    this.linkChecking.set(true);
    this.linkFoundName.set(null);
    this.linkNotFound.set(false);
    this.linkMsg.set(null);
    this.api.searchUser(e).subscribe({
      next: r => {
        this.linkChecking.set(false);
        if (r.found) {
          this.linkFoundName.set(r.fullName || e);
        } else {
          this.linkNotFound.set(true);   // belum berdaftar -> akan invite
        }
      },
      error: () => { this.linkChecking.set(false); this.linkMsg.set('Gagal menyemak email.'); }
    });
  }

  // Confirm link/invite
  confirmLink() {
    const e = (this.linkEmail || '').trim();
    if (!e) return;
    this.api.linkUser(this.editingId()!, e).subscribe({
      next: r => {
        this.linkPanelOpen.set(false);
        if (r.linked) {
          this.linkedEmail.set(e);
          this.linkMsg.set(null);
        } else {
          this.linkMsg.set(r.message || 'Jemputan dihantar.');
        }
      },
      error: err => this.linkMsg.set(err?.error?.message || 'Gagal memaut akaun.')
    });
  }

  unlink() {
    this.api.unlinkUser(this.editingId()!).subscribe({
      next: () => { this.linkedEmail.set(null); this.linkMsg.set(null); },
      error: () => this.linkMsg.set('Gagal membatalkan pautan.')
    });
  }

  // Produk untuk tambah: Add mod = semua; Edit mod = yang belum dilanggan (bukan editSubs aktif)
  availableProducts() {
    if (!this.isEdit()) return this.products();
    const subscribed = new Set(this.editSubs.filter(s => !s.deleted).map(s => s.productId));
    return this.products().filter(p => !subscribed.has(p.id));
  }

  // Delete subscription sedia ada (tandai deleted, bukan buang)
  toggleEditSub(sub: any) { sub.deleted = !sub.deleted; }
  editSubAmount(sub: any): number {
    const price = this.allowPriceOverride() ? (sub.unitPrice ?? sub.rate) : sub.rate;
    return (sub.quantity || 0) * price;
  }

  closeForm() { this.formOpen.set(false); this.editingId.set(null); }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.linkPanelOpen()) { this.closeLinkPanel(); return; }
    if (this.subModalOpen()) { this.closeSubModal(); return; }
    if (this.formOpen()) this.closeForm();
  }

  @HostListener('document:click')
  onDocClick() { if (this.moreMenuFor() !== null) this.closeMore(); }

  // Poskod akaun -> auto-isi negeri, cadang bandar
  onAddrPostcode() {
    // Had 5 digit, nombor sahaja
    let pc = (this.draft.addrPostcode || '').replace(/[^0-9]/g, '').slice(0, 5);
    this.draft.addrPostcode = pc;
    if (pc.length !== 5) { this.cityHints.set([]); return; }
    this.api.postcodeLookup(pc).subscribe({
      next: r => {
        this.draft.addrState = r.state;              // paksa tukar setiap lookup
        this.cityHints.set(r.cities);
        this.draft.addrLine3 = r.cities.length === 1 ? r.cities[0] : '';
      },
      error: () => { this.draft.addrState = ''; this.cityHints.set([]); }
    });
  }

  onBilltoPostcode() {
    let pc = (this.draft.billtoPostcode || '').replace(/[^0-9]/g, '').slice(0, 5);
    this.draft.billtoPostcode = pc;
    if (pc.length !== 5) { this.billtoCityHints.set([]); return; }
    this.api.postcodeLookup(pc).subscribe({
      next: r => {
        this.draft.billtoState = r.state;
        this.billtoCityHints.set(r.cities);
        this.draft.billtoAddrLine3 = r.cities.length === 1 ? r.cities[0] : '';
      },
      error: () => { this.draft.billtoState = ''; this.billtoCityHints.set([]); }
    });
  }

  // Checkbox: copy alamat akaun -> billing
  onSameAsAccount() {
    if (this.sameAsAccount) {
      this.draft.billtoAddrLine1 = this.draft.addrLine1;
      this.draft.billtoAddrLine2 = this.draft.addrLine2;
      this.draft.billtoAddrLine3 = this.draft.addrLine3;
      this.draft.billtoAddrLine4 = this.draft.addrLine4;
      this.draft.billtoPostcode = this.draft.addrPostcode;
      this.draft.billtoState = this.draft.addrState;
      this.draft.billtoCountry = this.draft.addrCountry;
    } else {
      this.draft.billtoAddrLine1 = '';
      this.draft.billtoAddrLine2 = '';
      this.draft.billtoAddrLine3 = '';
      this.draft.billtoAddrLine4 = '';
      this.draft.billtoPostcode = '';
      this.draft.billtoState = '';
      this.draft.billtoCountry = 'MY';
    }
  }

  // Toggle produk dalam jadual langganan
  toggleProduct(prod: Product) {
    const cur = this.subLines[prod.id];
    if (cur?.checked) {
      this.subLines[prod.id] = { ...cur, checked: false };
    } else {
      this.subLines[prod.id] = {
        checked: true, quantity: 1, startDate: '', endDate: '',
        unitPrice: prod.rate ?? null
      };
    }
  }

  isChecked(id: number): boolean { return !!this.subLines[id]?.checked; }

  amountFor(id: number): number {
    const l = this.subLines[id];
    if (!l) return 0;
    const prod = this.products().find(p => p.id === id);
    const baseRate = prod?.rate ?? 0;
    // Kalau SP benarkan override, guna effective (unitPrice); jika tidak, guna harga produk
    const price = this.allowPriceOverride() ? (l.unitPrice ?? baseRate) : baseRate;
    return (l.quantity || 0) * price;
  }

  freqLabelFor(f: string): string {
    const m: Record<string, string> = {
      ONE_TIME: 'One Time', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
      HALF_YEAR: 'Half Yearly', YEAR: 'Yearly', PER_USE: 'Per Use'
    };
    return m[f] ?? f;
  }

  // Hanya digit untuk telefon
  onlyDigits(field: 'billtoMobile') {
    this.draft[field] = (this.draft[field] || '').replace(/[^0-9]/g, '');
  }

  // UPPERCASE masa taip
  upper(field: string) {
    const d = this.draft as Record<string, unknown>;
    if (typeof d[field] === 'string') {
      d[field] = (d[field] as string).toUpperCase();
    }
  }

  private validEmail(e: string): boolean {
    if (!e) return true;  // email pilihan
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  saveAccount() {
    if (!this.draft.accountNo.trim() || !this.draft.accountName.trim()) {
      this.error.set('No. Akaun dan Nama wajib diisi.');
      return;
    }
    if (!this.draft.billtoName.trim()) {
      this.error.set('Bill To Name wajib diisi.');
      return;
    }
    // Validasi email
    if (!this.validEmail(this.draft.billtoEmail) || !this.validEmail(this.draft.billtoEmailSecondary)) {
      this.emailErr.set('Format email tidak sah.');
      return;
    }
    this.emailErr.set(null);
    this.saving.set(true);

    // Kumpul subscriptions dari subLines yang ditick
    const subs = Object.entries(this.subLines)
      .filter(([, v]) => v.checked)
      .map(([pid, v]) => ({
        productId: Number(pid),
        quantity: v.quantity || 1,
        startDate: v.startDate || null,
        endDate: v.endDate || null,
        unitPrice: v.unitPrice
      }));

    // UPPERCASE semua field teks
    const up = (x: string) => (x || '').toUpperCase();
    const b: Record<string, unknown> = {
      accountNo: up(this.draft.accountNo), accountName: up(this.draft.accountName),
      accountType: up(this.draft.accountType),
      categoryId: this.draft.categoryId,
      chargeFrequency: this.draft.chargeFrequency,
      startDate: this.draft.startDate || null,
      depositAmount: this.draft.depositAmount, openingAmount: this.draft.openingAmount,
      remarks: up(this.draft.remarks), memberIdNo: up(this.draft.memberIdNo),
      // alamat akaun
      addrLine1: up(this.draft.addrLine1), addrLine2: up(this.draft.addrLine2),
      addrLine3: up(this.draft.addrLine3), addrLine4: up(this.draft.addrLine4),
      addrPostcode: this.draft.addrPostcode, addrState: up(this.draft.addrState),
      addrCountry: up(this.draft.addrCountry),
      // billing
      billtoName: up(this.draft.billtoName),
      billtoEmail: this.draft.billtoEmail, billtoEmailSecondary: this.draft.billtoEmailSecondary,
      billtoMobile: this.draft.billtoMobile,
      billtoAddrLine1: up(this.draft.billtoAddrLine1), billtoAddrLine2: up(this.draft.billtoAddrLine2),
      billtoAddrLine3: up(this.draft.billtoAddrLine3), billtoAddrLine4: up(this.draft.billtoAddrLine4),
      billtoPostcode: this.draft.billtoPostcode, billtoState: up(this.draft.billtoState),
      billtoCountry: up(this.draft.billtoCountry),
      subscriptions: subs
    };

    if (this.isEdit()) {
      // Edit: subscription = editSubs (sedia ada, dengan id + deleted) + subLines baru (id null)
      const editLines = this.editSubs.map(s => ({
        id: s.id, productId: s.productId,
        quantity: s.quantity || 1,
        startDate: s.startDate || null, endDate: s.endDate || null,
        unitPrice: s.unitPrice, deleted: !!s.deleted
      }));
      const newLines = Object.entries(this.subLines)
        .filter(([, v]) => v.checked)
        .map(([pid, v]) => ({
          id: null, productId: Number(pid),
          quantity: v.quantity || 1,
          startDate: v.startDate || null, endDate: v.endDate || null,
          unitPrice: v.unitPrice, deleted: false
        }));
      const editBody: Record<string, unknown> = { ...b, status: this.editStatus(), subscriptions: [...editLines, ...newLines] };
      delete editBody['accountNo'];  // readonly
      this.api.update(this.editingId()!, editBody).subscribe({
        next: () => { this.saving.set(false); this.formOpen.set(false); this.editingId.set(null); this.load(); },
        error: e => { this.saving.set(false); this.error.set(e?.error?.message || 'Gagal mengemas kini akaun.'); }
      });
    } else {
      this.api.create(b).subscribe({
        next: () => { this.saving.set(false); this.formOpen.set(false); this.page.set(0); this.load(); },
        error: e => { this.saving.set(false); this.error.set(e?.error?.message || 'Gagal menyimpan akaun.'); }
      });
    }
  }

  constructor() {
    this.api.categories().subscribe({ next: c => this.categories.set(c), error: () => {} });
    this.catalog.list({ active: true, page: 0, size: 100 })
      .subscribe({ next: r => this.products.set(r.items), error: () => {} });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    const q = [this.fAccount, this.fName].filter(Boolean).join(' ').trim();
    this.api.list({
      active: this.activeTab(),
      linked: this.fLinked === '' ? null : this.fLinked === 'true',
      q: q || null,
      page: this.page(),
      size: this.size()
    }).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.error.set('Gagal memuatkan akaun. Pastikan backend berjalan di :8080.');
        this.loading.set(false);
        console.error(e);
      }
    });
  }

  toggleSearch() { this.searchOpen.set(!this.searchOpen()); }

  switchTab(active: boolean) {
    if (this.activeTab() === active) return;
    this.activeTab.set(active);
    this.page.set(0);
    this.load();
  }

  search() { this.page.set(0); this.load(); }

  clear() {
    this.fAccount = ''; this.fName = ''; this.fCategory = null;
    this.fBalFrom = ''; this.fBalTo = ''; this.fLinked = '';
    this.fProdCategory = null; this.fProduct = null;
    this.page.set(0);
    this.load();
  }

  goPage(p: number) {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  pageNumbers(): number[] {
    return Array.from({ length: Math.min(this.totalPages(), 5) }, (_, i) => i);
  }

  /** Format seperti prototaip: "MYR 12,000.00" */
  fmtBal(v: number): string {
    return 'MYR ' + (v ?? 0).toLocaleString('en-MY', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  /** Merah bila ada tunggakan, hijau bila bersih — seperti prototaip. */
  balColor(v: number): string {
    return (v ?? 0) > 0 ? 'var(--red)' : 'var(--green)';
  }
}
