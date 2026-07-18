import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset.component.html',
  styleUrl: './auth-page.scss'
})
export class ResetComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly token = signal<string | null>(this.route.snapshot.queryParamMap.get('token'));
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal<string | null>(null);

  password = '';
  confirm = '';
  show = false;

  submit() {
    const t = this.token();
    if (!t) { this.error.set('Pautan tidak lengkap.'); return; }
    if (this.password.length < 6) { this.error.set('Kata laluan minimum 6 aksara.'); return; }
    if (this.password !== this.confirm) { this.error.set('Kata laluan tidak sepadan.'); return; }

    this.busy.set(true);
    this.error.set(null);
    this.auth.resetPassword(t, this.password).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
        setTimeout(() => this.router.navigateByUrl(this.auth.landingRoute()), 1800);
      },
      error: e => {
        this.busy.set(false);
        this.error.set(e?.error?.message ?? 'Gagal reset kata laluan.');
      }
    });
  }
}
