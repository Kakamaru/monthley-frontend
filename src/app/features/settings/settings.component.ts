import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SettingsService, SpRole, Member, Profile, Billing, DocumentSetting,
  Penalty, PlanInfo, Lookup, Branch, ExcludePeriod, BusinessType
} from './settings.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { YesNoComponent } from '../../core/ui/yesno.component';

interface Tab { id: string; label: string; }

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, YesNoComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private api = inject(SettingsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  /** 16 tab — tepat dari prototaip (settingsSecs) */
  readonly tabs: Tab[] = [
    { id: 'profile',      label: 'Profile' },
    { id: 'salestax',     label: 'Sales Tax' },
    { id: 'localization', label: 'Localization Setting' },
    { id: 'invoice',      label: 'Invoice Setting' },
    { id: 'exclude',      label: 'Invoice Period Exclude Setting' },
    { id: 'receipt',      label: 'Receipt Setting' },
    { id: 'acctcat',      label: 'Custom Account Categories' },
    { id: 'prodcat',      label: 'Custom Product Category' },
    { id: 'branch',       label: 'Account Branch' },
    { id: 'statement',    label: 'Statement' },
    { id: 'plan',         label: 'Manage Plan' },
    { id: 'license',      label: 'Manage License' },
    { id: 'roles',        label: 'Roles Setting' },
    { id: 'penalty',      label: 'Late Penalty' },
    { id: 'application',  label: 'Application' },
    { id: 'accesscard',   label: 'Access Card' }
  ];

  readonly active = signal('profile');
  readonly notice = signal<string | null>(null);
  readonly error  = signal<string | null>(null);
  readonly busy   = signal(false);

  // ---------- data setiap tab ----------
  readonly profile  = signal<Profile>({ name: '' });
  readonly billing  = signal<Billing>({});
  readonly doc      = signal<DocumentSetting>({});
  readonly penalty  = signal<Penalty>({});
  readonly plan     = signal<PlanInfo | null>(null);
  readonly roles    = signal<SpRole[]>([]);
  readonly members  = signal<Member[]>([]);
  readonly acctCats = signal<Lookup[]>([]);
  readonly prodCats = signal<Lookup[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly excludes = signal<ExcludePeriod[]>([]);
  readonly bizTypes = signal<BusinessType[]>([]);

  // borang tambah
  readonly addOpen = signal(false);
  newEmail = ''; newRole = 'CLERK';
  lkCode = ''; lkName = ''; lkAddress = '';
  exPeriod = ''; exRemarks = '';

  /**
   * Pilihan tempoh untuk exclude: bulan semasa hingga Disember tahun HADAPAN.
   * Contoh: Julai 2026 -> Jul 2026 ... Dis 2027 (18 pilihan).
   * Dikira dari tarikh semasa — tiada senarai keras, tahun bertukar sendiri.
   */
  get excludeOptions(): { value: string; label: string }[] {
    const now = new Date();
    const bulan = ['Januari','Februari','Mac','April','Mei','Jun',
                   'Julai','Ogos','September','Oktober','November','Disember'];
    const out: { value: string; label: string }[] = [];
    let y = now.getFullYear();
    let m = now.getMonth();
    const endY = now.getFullYear() + 1;
    while (y < endY || (y === endY && m <= 11)) {
      const mm = String(m + 1).padStart(2, '0');
      out.push({ value: `${y}-${mm}`, label: `${bulan[m]} ${y}` });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return out;
  }

  /** Susunan tepat dari design */
  readonly negeri = [
    'Perak', 'Selangor', 'Kuala Lumpur', 'Johor', 'Pulau Pinang', 'Kedah',
    'Kelantan', 'Terengganu', 'Pahang', 'Negeri Sembilan', 'Melaka',
    'Sabah', 'Sarawak', 'Perlis', 'Putrajaya', 'Labuan'
  ];

  readonly negara = ['Malaysia', 'Singapore', 'Indonesia', 'Brunei'];

  /** Template dokumen — dari design */
  readonly invoiceTemplates = [
    'Invoice (Standard) A4 Potrait',
    'Invoice (Standard) A4 Potrait - Dark Theme',
    'Invoice (Standard) A5 Landskap - Dark Theme'
  ];
  readonly receiptTemplates = [
    'Receipt (Standard) A4 Potrait',
    'Receipt (Standard) A4 Potrait - Dark Theme',
    'Receipt (Standard) A5 Landskap - Dark Theme'
  ];

  readonly einvoiceTypes = [
    { code: 'INVOICE',     label: 'Invois' },
    { code: 'CREDIT_NOTE', label: 'Nota Kredit' },
    { code: 'DEBIT_NOTE',  label: 'Nota Debit' },
    { code: 'REFUND_NOTE', label: 'Nota Refund' }
  ];

  readonly einvoiceClasses = [
    { code: 'GENERAL',    label: 'General' },
    { code: 'SERVICE',    label: 'Perkhidmatan' },
    { code: 'RENTAL',     label: 'Sewaan' },
    { code: 'MEMBERSHIP', label: 'Yuran Keahlian' },
    { code: 'DONATION',   label: 'Sumbangan' }
  ];

  constructor() {
    this.api.roles().subscribe({ next: r => this.roles.set(r), error: () => {} });
    this.api.businessTypes().subscribe({ next: b => this.bizTypes.set(b), error: () => {} });
    this.load('profile');
  }

  select(id: string) {
    this.active.set(id);
    this.error.set(null);
    this.load(id);
  }

  /** Muat data ikut tab — hanya apa yang perlu. */
  private load(id: string) {
    switch (id) {
      case 'profile':
        this.api.profile().subscribe({ next: p => this.profile.set(p), error: () => this.fail() });
        break;
      case 'salestax':
      case 'localization':
        this.api.billing().subscribe({ next: b => this.billing.set(b), error: () => this.fail() });
        break;
      case 'invoice':
        this.api.document().subscribe({ next: d => this.doc.set(d), error: () => this.fail() });
        this.api.billing().subscribe({ next: b => this.billing.set(b), error: () => {} });
        break;
      case 'receipt':
      case 'statement':
        this.api.document().subscribe({ next: d => this.doc.set(d), error: () => this.fail() });
        break;
      case 'penalty':
        this.api.penalty().subscribe({ next: p => this.penalty.set(p), error: () => this.fail() });
        break;
      case 'plan':
        this.api.plan().subscribe({ next: p => this.plan.set(p), error: () => this.fail() });
        break;
      case 'roles':
        this.api.members().subscribe({ next: m => this.members.set(m), error: () => this.fail() });
        break;
      case 'acctcat':
        this.api.accountCategories().subscribe({ next: c => this.acctCats.set(c), error: () => this.fail() });
        break;
      case 'prodcat':
        this.api.productCategories().subscribe({ next: c => this.prodCats.set(c), error: () => this.fail() });
        break;
      case 'branch':
        this.api.branches().subscribe({ next: b => this.branches.set(b), error: () => this.fail() });
        break;
      case 'exclude':
        this.api.excludePeriods().subscribe({ next: e => this.excludes.set(e), error: () => this.fail() });
        break;
    }
  }

  scrollTabs(dir: number) {
    document.getElementById('settings-tabstrip')?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  }

  // ---------- simpan ----------

  saveProfile() { this.save(this.api.saveProfile(this.profile())); }
  saveBilling() { this.save(this.api.saveBilling(this.billing())); }
  saveDocument() { this.save(this.api.saveDocument(this.doc())); }

  /** Tab Invoice ada Payment Term (billing) + medan dokumen — simpan dua-dua. */
  saveInvoice() {
    this.busy.set(true);
    this.api.saveDocument(this.doc()).subscribe({
      next: () => {
        this.api.saveBilling(this.billing()).subscribe({
          next: () => { this.busy.set(false); this.flash('Tetapan invois dikemas kini.'); },
          error: e => { this.busy.set(false); this.toast.error('Gagal menyimpan', e?.error?.message); }
        });
      },
      error: e => { this.busy.set(false); this.toast.error('Gagal menyimpan', e?.error?.message); }
    });
  }

  savePenalty() { this.save(this.api.savePenalty(this.penalty())); }

  private save(obs: { subscribe: Function }) {
    this.busy.set(true);
    this.error.set(null);
    (obs as any).subscribe({
      next: (r: { message: string }) => { this.busy.set(false); this.flash(r.message); },
      error: (e: any) => {
        this.busy.set(false);
        this.toast.error('Gagal menyimpan', e?.error?.message);
      }
    });
  }

  // ---------- roles ----------

  addMember() {
    if (!this.newEmail.trim()) return;
    this.busy.set(true);
    this.api.addMember(this.newEmail.trim(), this.newRole).subscribe({
      next: r => {
        this.busy.set(false); this.addOpen.set(false); this.newEmail = '';
        this.flash(r.message); this.load('roles');
      },
      error: e => { this.busy.set(false); this.toast.error('Gagal menambah ahli', e?.error?.message); }
    });
  }

  changeRole(m: Member, role: string) {
    if (role === m.role) return;
    this.api.changeRole(m.id, role).subscribe({
      next: r => { this.flash(r.message); this.load('roles'); },
      error: e => { this.toast.error('Gagal menukar peranan', e?.error?.message); this.load('roles'); }
    });
  }

  async removeMember(m: Member) {
    const ok = await this.confirm.askDelete(
      `${m.fullName} (${m.roleName})`,
      'Mereka akan hilang akses kepada SP ini serta-merta.');
    if (!ok) return;

    this.api.removeMember(m.id).subscribe({
      next: r => { this.flash(r.message); this.load('roles'); },
      error: e => this.toast.error('Gagal membuang ahli', e?.error?.message)
    });
  }

  // ---------- lookups ----------

  addLookup(kind: 'acctcat' | 'prodcat' | 'branch') {
    if (!this.lkCode.trim() || !this.lkName.trim()) return;
    const fn = kind === 'acctcat' ? this.api.addAccountCategory(this.lkCode, this.lkName)
             : kind === 'prodcat' ? this.api.addProductCategory(this.lkCode, this.lkName)
             : this.api.addBranch(this.lkCode, this.lkName, this.lkAddress || undefined);
    fn.subscribe({
      next: r => {
        this.lkCode = ''; this.lkName = ''; this.lkAddress = '';
        this.flash(r.message); this.load(kind);
      },
      error: e => this.toast.error('Gagal', e?.error?.message)
    });
  }

  async delLookup(kind: 'acctcat' | 'prodcat' | 'branch', id: number) {
    const list = kind === 'acctcat' ? this.acctCats()
               : kind === 'prodcat' ? this.prodCats() : this.branches();
    const item = list.find(x => x.id === id);
    const ok = await this.confirm.askDelete(item ? `"${item.name}"` : 'rekod ini');
    if (!ok) return;

    const fn = kind === 'acctcat' ? this.api.delAccountCategory(id)
             : kind === 'prodcat' ? this.api.delProductCategory(id)
             : this.api.delBranch(id);
    fn.subscribe({
      next: r => { this.flash(r.message); this.load(kind); },
      error: e => this.toast.error('Tidak boleh dibuang', e?.error?.message)
    });
  }

  // ---------- exclude ----------

  addExclude() {
    if (!this.exPeriod.trim()) return;
    this.api.addExclude(this.exPeriod, this.exRemarks || undefined).subscribe({
      next: r => { this.exPeriod = ''; this.exRemarks = ''; this.flash(r.message); this.load('exclude'); },
      error: e => this.toast.error('Gagal', e?.error?.message)
    });
  }

  async delExclude(id: number) {
    const e = this.excludes().find(x => x.id === id);
    const ok = await this.confirm.askDelete(
      e ? `pengecualian ${e.period}` : 'pengecualian ini',
      'Invois untuk tempoh ini akan dijana semula pada larian seterusnya.');
    if (!ok) return;

    this.api.delExclude(id).subscribe({
      next: r => { this.flash(r.message); this.load('exclude'); },
      error: err => this.toast.error('Gagal', err?.error?.message)
    });
  }

  // ---------- helper ----------

  roleColor(code: string): string {
    switch (code) {
      case 'SP_ADMIN': return 'var(--green)';
      case 'CLERK':    return 'var(--orange)';
      default:         return 'var(--muted)';
    }
  }

  roleBg(code: string): string {
    switch (code) {
      case 'SP_ADMIN': return 'var(--green-soft)';
      case 'CLERK':    return 'rgba(224,134,59,.12)';
      default:         return 'var(--surface-alt)';
    }
  }

  planUsage(): number {
    const p = this.plan();
    if (!p?.accountLimit) return 0;
    return Math.round((p.accountUsed / p.accountLimit) * 100);
  }

  tabLabel(id: string): string {
    return this.tabs.find(t => t.id === id)?.label ?? id;
  }

  private flash(msg: string) {
    this.toast.success(msg);
    this.error.set(null);
  }

  private fail() { this.toast.error('Gagal memuatkan tetapan.'); }
}
