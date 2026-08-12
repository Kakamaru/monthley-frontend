import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SpContextService } from '../../core/services/sp-context.service';
import { ModuleService } from '../../core/services/module.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem { id: string; icon: string; label: string; route?: string; roles?: string[]; }

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal-shell.component.html',
  styleUrl: './portal-shell.component.scss'
})
export class PortalShellComponent {
  readonly sp = inject(SpContextService);
  readonly modules = inject(ModuleService);
  private readonly router = inject(Router);
  readonly themeSvc = inject(ThemeService);
  readonly auth = inject(AuthService);

  readonly lang = signal<'BM' | 'EN'>('BM');
  readonly custOpen = signal(true);
  readonly spOpen = signal(true);
  readonly platOpen = signal(true);
  readonly spSwitchOpen = signal(false);
  readonly mobileNav = signal(false);   // drawer sidebar mobile

  /** Platform — superadmin sahaja */
  readonly navPlatform: NavItem[] = [
    { id: 'p_sps',      icon: '🏢', label: 'Service Providers', route: '/platform/service-providers' },
    { id: 'p_onboard',  icon: '➕', label: 'Onboard SP',        route: '/platform/onboard' },
    { id: 'p_users',    icon: '👤', label: 'Pengguna', route: '/platform/users' },
    { id: 'p_modules',  icon: '🧩', label: 'Katalog Modul', route: '/platform/modules' },
    { id: 'p_reqs',     icon: '📨', label: 'Permohonan SP', route: '/platform/change-requests' }
  ];

  /** Menu Pelanggan — ikon & label tepat dari prototaip */
  readonly navCust: NavItem[] = [
    { id: 'c_dashboard',  icon: '📊',  label: 'Dashboard',  route: '/portal/my-accounts' },
    { id: 'c_accounts',   icon: '📁',  label: 'Akaun Saya', route: '/portal/my-accounts' },
    { id: 'c_donations',  icon: '🤲',  label: 'Sumbangan' },
    { id: 'c_complaints', icon: '🗣️', label: 'Aduan', route: '/portal/my-complaints' },
    { id: 'c_memo',       icon: '📝',  label: 'Memo' }
  ];

  /** Service Provider — navMain + navSP dari prototaip */
  readonly navSP: NavItem[] = [
    { id: 'dashboard',    icon: '📊',  label: 'Panel Utama', route: '/portal/dashboard' },
    { id: 'products',     icon: '📦',  label: 'Produk', route: '/portal/products', roles: ['SP_ADMIN'] },
    { id: 'accounts',     icon: '👥',  label: 'Akaun', route: '/portal/accounts' },
    { id: 'manualPay',    icon: '💵',  label: 'Manual Payment', route: '/portal/manual-payment', roles: ['CLERK'] },
    { id: 'finance',      icon: '📁',  label: 'Dokumen Kewangan', route: '/portal/finance-documents' },
    { id: 'adhoc',        icon: '⚡',  label: 'Adhoc Invois', route: '/portal/adhoc-invoice' },
    { id: 'reports',      icon: '📈',  label: 'Laporan', route: '/portal/reports' },
    { id: 'tools',        icon: '🛠️', label: 'Alat', route: '/portal/tools', roles: ['SP_ADMIN'] },
    { id: 'settings',     icon: '⚙️', label: 'Tetapan', route: '/portal/settings', roles: ['SP_ADMIN'] },
    // VIEWER termasuk: pengawal pondok jaga tidak memerlukannya, tetapi
    // lejar ialah bacaan sahaja dan endpoint membenarkan ketiga-tiga.
    { id: 'spStatement',  icon: '📑',  label: 'SP Account Statement', route: '/portal/sp-ledger' },
    { id: 'memo',         icon: '📝',  label: 'Memo' },
    { id: 'donation',     icon: '🤲',  label: 'Kutipan Derma' }
  ];

  /**
   * Perbelanjaan — kumpulan sendiri, bukan di bawah Service Provider.
   *
   * Ia modul tambahan yang dilanggan berasingan (ADR 0016), bukan
   * sebahagian menu SP teras. Meletakkannya di dalam Service Provider
   * bermakna menu itu berkembang setiap kali modul baharu ditambah.
   */
  readonly navExpenses: NavItem[] = [
    { id: 'expDash',     icon: '📊', label: 'Dashboard',    route: '/portal/expenses/dashboard' },
    { id: 'expCashbook', icon: '📒', label: 'Buku Tunai',   route: '/portal/expenses/cashbook' },
    { id: 'expSupplier', icon: '🏢', label: 'Pembekal',     route: '/portal/expenses/suppliers' },
    { id: 'expInvoice',  icon: '🧾', label: 'Invois',       route: '/portal/expenses/invoices' },
    { id: 'expPayment',  icon: '💳', label: 'Bayaran / PV', route: '/portal/expenses/payments' },
    { id: 'expReport',   icon: '📈', label: 'Laporan',      route: '/portal/expenses/reports' },
    { id: 'expCategory', icon: '🏷️', label: 'Kategori',     route: '/portal/expenses/categories', roles: ['SP_ADMIN'] },
    { id: 'expSetting',  icon: '⚙️', label: 'Tetapan',      route: '/portal/expenses/settings', roles: ['SP_ADMIN'] }
  ];

  readonly visibleExpenses = computed(() =>
    this.navExpenses.filter(it => this.bolehLihat(it)));

  readonly expOpen = signal(false);
  toggleExp() { this.expOpen.set(!this.expOpen()); }

  /** Aduan — modul tambahan, kumpulan sendiri seperti Perbelanjaan. */
  readonly navComplaints: NavItem[] = [
    { id: 'aduDash', icon: '📊', label: 'Dashboard Aduan', route: '/portal/complaints/dashboard' },
    { id: 'aduList', icon: '🗣️', label: 'Senarai Aduan',   route: '/portal/complaints/list' },
    { id: 'aduSet',  icon: '⚙️', label: 'Tetapan Aduan',   route: '/portal/complaints/settings', roles: ['SP_ADMIN'] }
  ];

  readonly visibleComplaints = computed(() =>
    this.navComplaints.filter(it => this.bolehLihat(it)));

  readonly aduOpen = signal(false);
  toggleAdu() { this.aduOpen.set(!this.aduOpen()); }

  /** Modul ini ditawarkan kepada sektor SP semasa? */
  modulDitawarkan(kod: string): boolean {
    return this.modules.modules().some(m => m.code === kod);
  }

  /** Menu SP yang pengguna benar-benar boleh nampak — ditapis ikut peranan. */
  readonly visibleSP = computed(() =>
    this.navSP.filter(it => this.bolehLihat(it)));

  private bolehLihat(it: NavItem): boolean {
    if (!it.roles) return true;
    if (this.auth.isSuperadmin()) return true;
    return it.roles.some(r => this.sp.currentRoles().includes(r));
  }


  /** Inisial untuk avatar SP */
  readonly spInitial = computed(() => (this.sp.spName() || '?').charAt(0).toUpperCase());
  readonly userInitial = computed(() => (this.auth.displayName() || '?').charAt(0).toUpperCase());

  readonly userRole = computed(() => {
    if (this.auth.isSuperadmin()) return 'Superadmin';
    if (this.auth.isSpAdmin()) return 'SP Admin';
    return 'Pelanggan';
  });

  toggleLang() { this.lang.set(this.lang() === 'BM' ? 'EN' : 'BM'); }
  toggleMobileNav() { this.mobileNav.set(!this.mobileNav()); }
  closeMobileNav() { this.mobileNav.set(false); }
  toggleCust() { this.custOpen.set(!this.custOpen()); }
  toggleSP()   { this.spOpen.set(!this.spOpen()); }
  togglePlat() { this.platOpen.set(!this.platOpen()); }

  /**
   * Menukar SP mesti memuat semula skrin semasa.
   *
   * Menetapkan signal sahaja tidak memadai: komponen skrin tidak dicipta
   * semula kerana laluan tidak berubah, jadi ia kekal memaparkan data SP
   * sebelumnya sehingga pengguna pergi ke menu lain dan kembali.
   *
   * Diselesaikan di sini dan bukan dalam setiap komponen — kalau tidak,
   * setiap skrin baharu perlu ingat melakukannya sendiri.
   */
  switchSp(code: string) {
    this.sp.setSp(code);
    this.spSwitchOpen.set(false);

    // navigateByUrl ke URL yang sama tidak memadai: RouteReuseStrategy lalai
    // menggunakan semula komponen kerana konfigurasi laluan tidak berubah.
    // Singgah sebentar ke laluan kosong memaksa komponen dimusnahkan dan
    // dicipta semula, jadi ia memuat data dengan SP baharu.
    const url = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true })
        .then(() => this.router.navigateByUrl(url));
  }
}
