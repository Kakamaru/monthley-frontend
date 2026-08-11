import { Routes } from '@angular/router';
import { PortalShellComponent } from './layout/portal-shell/portal-shell.component';
import { authGuard, spAdminGuard, superadminGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent)
  },

  {
    path: 'verify',
    loadComponent: () =>
      import('./features/auth/verify.component').then(m => m.VerifyComponent)
  },
  {
    path: 'reset',
    loadComponent: () =>
      import('./features/auth/reset.component').then(m => m.ResetComponent)
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
        path: 'dashboard', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/dashboard/sp-dashboard.component').then(m => m.SpDashboardComponent)
      },
      {
        path: 'products', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/products/products.component').then(m => m.ProductsComponent)
      },
      // Dokumen Kewangan — CLERK mencetak semula, SP_ADMIN membatalkan.
      // Tiada spAdminGuard: kerani memerlukan skrin ini setiap hari.
      {
        path: 'adhoc-invoice',
        loadComponent: () =>
          import('./features/adhoc/adhoc.component').then(m => m.AdhocComponent)
      },
      {
        path: 'finance-documents',
        loadComponent: () =>
          import('./features/documents/documents.component').then(m => m.DocumentsComponent)
      },
      {
        path: 'accounts', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/accounts/accounts.component').then(m => m.AccountsComponent)
      },
      {
        path: 'manual-payment', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/payment/manual-payment.component').then(m => m.ManualPaymentComponent)
      },
      {
        path: 'expenses/settings', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/expenses/settings.component').then(m => m.ExpSettingsComponent)
      },
      {
        path: 'expenses/categories', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/expenses/categories.component').then(m => m.ExpCategoriesComponent)
      },
      {
        path: 'expenses/reports',
        loadComponent: () =>
          import('./features/expenses/reports.component').then(m => m.ExpReportsComponent)
      },
      {
        path: 'expenses/cashbook',
        loadComponent: () =>
          import('./features/expenses/cashbook.component').then(m => m.ExpCashbookComponent)
      },
      {
        path: 'expenses/payments',
        loadComponent: () =>
          import('./features/expenses/payments.component').then(m => m.ExpPaymentsComponent)
      },
      {
        path: 'expenses/invoices',
        loadComponent: () =>
          import('./features/expenses/invoices.component').then(m => m.ExpInvoicesComponent)
      },
      {
        path: 'expenses/suppliers',
        loadComponent: () =>
          import('./features/expenses/suppliers.component').then(m => m.ExpSuppliersComponent)
      },
      {
        path: 'settings', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        // Alat menggantikan Jana Bil: kedua-dua kadnya berpindah ke sini,
        // dan Caj Penggunaan ditambah di bawahnya.
        //
        // SP_ADMIN sahaja. Endpoint caj penggunaan membenarkan CLERK
        // juga, tetapi skrin ini mengandungi butang Jana Bil — kerani
        // yang boleh memuat naik meter tidak sepatutnya boleh menjana
        // bil untuk semua akaun. Kalau kerani perlu memuat naik, Caj
        // Penggunaan memerlukan skrinnya sendiri.
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'sp-ledger',
        loadComponent: () =>
          import('./features/sp-ledger/sp-ledger.component').then(m => m.SpLedgerComponent)
      },
      {
        path: 'tools', canActivate: [spAdminGuard],
        loadComponent: () =>
          import('./features/tools/tools.component').then(m => m.ToolsComponent)
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
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/platform/users.component').then(m => m.PlatformUsersComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];
