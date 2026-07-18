import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SpContextService } from '../../core/services/sp-context.service';
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
  readonly themeSvc = inject(ThemeService);
  readonly auth = inject(AuthService);

  readonly lang = signal<'BM' | 'EN'>('BM');
  readonly custOpen = signal(true);
  readonly spOpen = signal(true);
  readonly platOpen = signal(true);
  readonly spSwitchOpen = signal(false);

  /** Platform — superadmin sahaja */
  readonly navPlatform: NavItem[] = [
    { id: 'p_sps',      icon: '🏢', label: 'Service Providers', route: '/platform/service-providers' },
    { id: 'p_onboard',  icon: '➕', label: 'Onboard SP',        route: '/platform/onboard' },
    { id: 'p_users',    icon: '👤', label: 'Pengguna', route: '/platform/users' }
  ];

  /** Menu Pelanggan — ikon & label tepat dari prototaip */
  readonly navCust: NavItem[] = [
    { id: 'c_dashboard',  icon: '📊',  label: 'Dashboard',  route: '/portal/my-accounts' },
    { id: 'c_accounts',   icon: '📁',  label: 'Akaun Saya', route: '/portal/my-accounts' },
    { id: 'c_donations',  icon: '🤲',  label: 'Sumbangan' },
    { id: 'c_complaints', icon: '🗣️', label: 'Aduan' },
    { id: 'c_memo',       icon: '📝',  label: 'Memo' }
  ];

  /** Service Provider — navMain + navSP dari prototaip */
  readonly navSP: NavItem[] = [
    { id: 'dashboard',    icon: '📊',  label: 'Panel Utama' },
    { id: 'settings',     icon: '⚙️', label: 'Tetapan', route: '/portal/settings', roles: ['SP_ADMIN'] },
    { id: 'products',     icon: '📦',  label: 'Produk', route: '/portal/products', roles: ['SP_ADMIN'] },
    { id: 'accounts',     icon: '👥',  label: 'Akaun', route: '/portal/accounts' },
    { id: 'invoicing',    icon: '🧾',  label: 'Jana Bil', route: '/portal/invoicing', roles: ['SP_ADMIN'] },
    { id: 'manualPay',    icon: '💵',  label: 'Manual Payment', route: '/portal/manual-payment', roles: ['CLERK'] },
    { id: 'finance',      icon: '📁',  label: 'Dokumen Kewangan' },
    { id: 'adhoc',        icon: '⚡',  label: 'Adhoc Invois' },
    { id: 'reports',      icon: '📈',  label: 'Laporan' },
    { id: 'tools',        icon: '🛠️', label: 'Alat' },
    { id: 'spStatement',  icon: '📑',  label: 'SP Account Statement' },
    { id: 'expenses',     icon: '💸',  label: 'Perbelanjaan' },
    { id: 'complaints',   icon: '🗣️', label: 'Aduan' },
    { id: 'memo',         icon: '📝',  label: 'Memo' },
    { id: 'donation',     icon: '🤲',  label: 'Kutipan Derma' }
  ];

  /** Menu SP yang pengguna benar-benar boleh nampak — ditapis ikut peranan. */
  readonly visibleSP = computed(() =>
    this.navSP.filter(it => {
      if (!it.roles) return true;                    // tiada sekatan
      if (this.auth.isSuperadmin()) return true;     // superadmin nampak semua
      return it.roles.some(r => this.sp.currentRoles().includes(r));
    }));

  /** Inisial untuk avatar SP */
  readonly spInitial = computed(() => (this.sp.spName() || '?').charAt(0).toUpperCase());
  readonly userInitial = computed(() => (this.auth.displayName() || '?').charAt(0).toUpperCase());

  readonly userRole = computed(() => {
    if (this.auth.isSuperadmin()) return 'Superadmin';
    if (this.auth.isSpAdmin()) return 'SP Admin';
    return 'Pelanggan';
  });

  toggleLang() { this.lang.set(this.lang() === 'BM' ? 'EN' : 'BM'); }
  toggleCust() { this.custOpen.set(!this.custOpen()); }
  toggleSP()   { this.spOpen.set(!this.spOpen()); }
  togglePlat() { this.platOpen.set(!this.platOpen()); }

  switchSp(code: string) {
    this.sp.setSp(code);
    this.spSwitchOpen.set(false);
  }
}
