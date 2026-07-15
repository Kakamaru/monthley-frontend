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
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
