import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SpContextService } from '../../core/services/sp-context.service';

interface NavItem { label: string; route?: string; icon: string; }
interface NavGroup { title: string; items: NavItem[]; }

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

  readonly groups: NavGroup[] = [
    {
      title: 'Pelanggan',
      items: [
        { label: 'Dashboard',       icon: '◔' },
        { label: 'Akaun Saya',      icon: '▤' },
        { label: 'Permohonan Saya', icon: '▦' }
      ]
    },
    {
      title: 'Service Provider',
      items: [
        { label: 'Dashboard',          icon: '◔' },
        { label: 'Products',           icon: '▣', route: '/products' },
        { label: 'Accounts',           icon: '▤' },
        { label: 'Finance Documents',  icon: '▥' },
        { label: 'Adhoc Invoice',      icon: '▧' },
        { label: 'Report',             icon: '▨' },
        { label: 'Settings',           icon: '⚙' },
        { label: 'Tools',              icon: '⛭' }
      ]
    }
  ];

  toggleLang() { this.lang.set(this.lang() === 'BM' ? 'EN' : 'BM'); }
}
