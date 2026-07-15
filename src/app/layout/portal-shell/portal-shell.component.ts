import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SpContextService } from '../../core/services/sp-context.service';

interface NavItem { id: string; icon: string; label: string; route?: string; }

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal-shell.component.html',
  styleUrl: './portal-shell.component.scss'
})
export class PortalShellComponent {
  readonly sp = inject(SpContextService);
  readonly lang = signal<'BM' | 'EN'>('BM');
  readonly custOpen = signal(true);
  readonly spOpen = signal(true);

  /** Menu Pelanggan — ikon & label tepat dari prototaip (navCust) */
  readonly navCust: NavItem[] = [
    { id: 'c_dashboard',  icon: '📊',  label: 'Dashboard' },
    { id: 'c_accounts',   icon: '📁',  label: 'Akaun Saya' },
    { id: 'c_donations',  icon: '🤲',  label: 'Sumbangan' },
    { id: 'c_complaints', icon: '🗣️', label: 'Aduan' },
    { id: 'c_memo',       icon: '📝',  label: 'Memo' }
  ];

  /** Service Provider — navMain + navSP dari prototaip */
  readonly navSP: NavItem[] = [
    { id: 'dashboard',    icon: '📊',  label: 'Panel Utama' },
    { id: 'settings',     icon: '⚙️', label: 'Tetapan' },
    { id: 'products',     icon: '📦',  label: 'Produk', route: '/products' },
    { id: 'accounts',     icon: '👥',  label: 'Akaun', route: '/accounts' },
    { id: 'invoicing',    icon: '🧾',  label: 'Jana Bil', route: '/invoicing' },
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

  toggleLang() { this.lang.set(this.lang() === 'BM' ? 'EN' : 'BM'); }
  toggleCust() { this.custOpen.set(!this.custOpen()); }
  toggleSP()   { this.spOpen.set(!this.spOpen()); }
}
