import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-service-providers',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="m-fade">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px">
        <div>
          <h1 class="h1">Service Providers</h1>
          <p class="sub">Urus organisasi yang menggunakan Monthley.</p>
        </div>
        <button class="btn btn-green" routerLink="/platform/onboard">+ Onboard SP</button>
      </div>

      <div class="card" data-card style="padding:56px 40px;text-align:center">
        <div style="font-size:40px;margin-bottom:14px">🏢</div>
        <h3 style="font-family:'Sora',sans-serif;font-weight:700;font-size:19px;margin:0 0 8px">
          Senarai SP
        </h3>
        <p style="color:var(--muted);margin:0">Skrin ini akan dibina seterusnya.</p>
      </div>
    </div>
  `
})
export class ServiceProvidersComponent {}
