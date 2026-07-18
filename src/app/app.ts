import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/ui/toast.component';
import { ConfirmComponent } from './core/ui/confirm.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, ConfirmComponent],
  template: `
    <router-outlet />
    <app-toast />
    <app-confirm />
  `
})
export class App {}
