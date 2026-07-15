import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-my-accounts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="m-fade">
      <h1 class="h1">Akaun Saya</h1>
      <p class="sub">Semua akaun anda merentas organisasi.</p>

      @if (!auth.hasAccounts()) {
        <div class="empty-card" data-card>
          <div class="empty-ic">📭</div>
          <h3>Belum ada akaun dipautkan</h3>
          <p>
            Akaun anda belum dipautkan dengan mana-mana organisasi.
            Hubungi organisasi anda dan berikan e-mel ini:
          </p>
          <div class="email-chip">{{ auth.session()?.email }}</div>
          <p class="hint">
            Setelah dipautkan, bil &amp; sejarah bayaran anda akan muncul di sini.
          </p>
        </div>
      } @else {
        <div class="empty-card" data-card>
          <p>Akaun dipautkan — senarai akan dipaparkan di sini.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .empty-card {
      background: var(--surface); border: 1px solid var(--line); border-radius: 18px;
      padding: 56px 40px; text-align: center; max-width: 560px; margin: 24px auto 0;
    }
    .empty-ic { font-size: 44px; margin-bottom: 16px; }
    h3 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 20px; margin: 0 0 10px; }
    p { color: var(--muted); font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .email-chip {
      display: inline-block; background: var(--green-soft); color: var(--green-dark);
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 15px;
      padding: 10px 20px; border-radius: 999px; margin-bottom: 16px;
    }
    .hint { font-size: 13px; margin: 0; }
  `]
})
export class MyAccountsComponent {
  readonly auth = inject(AuthService);
}
