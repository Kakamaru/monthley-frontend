import { Routes } from '@angular/router';
import { PortalShellComponent } from './layout/portal-shell/portal-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: PortalShellComponent,
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./features/accounts/accounts.component').then(m => m.AccountsComponent)
      },
      {
        path: 'invoicing',
        loadComponent: () =>
          import('./features/invoicing/invoicing.component').then(m => m.InvoicingComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
