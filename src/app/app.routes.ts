import { Routes } from '@angular/router';
import { PortalShellComponent } from './layout/portal-shell/portal-shell.component';
import { authGuard, spAdminGuard, superadminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent)
  },

  // ---------- Portal (perlu log masuk) ----------
  {
    path: 'portal',
    component: PortalShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'my-accounts', pathMatch: 'full' },

      // pelanggan — semua yang log masuk
      {
        path: 'my-accounts',
        loadComponent: () =>
          import('./features/customer/my-accounts.component').then(m => m.MyAccountsComponent)
      },

      // SP — perlu sp_membership
      {
        path: 'products', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'accounts', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/accounts/accounts.component').then(m => m.AccountsComponent)
      },
      {
        path: 'invoicing', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/invoicing/invoicing.component').then(m => m.InvoicingComponent)
      }
    ]
  },

  // ---------- Platform (superadmin) ----------
  {
    path: 'platform',
    component: PortalShellComponent,
    canActivate: [superadminGuard],
    children: [
      { path: '', redirectTo: 'service-providers', pathMatch: 'full' },
      {
        path: 'service-providers',
        loadComponent: () =>
          import('./features/platform/service-providers.component').then(m => m.ServiceProvidersComponent)
      },
      {
        path: 'onboard',
        loadComponent: () =>
          import('./features/platform/onboard.component').then(m => m.OnboardComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
