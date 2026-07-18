import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

type State = 'checking' | 'ok' | 'fail';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify.component.html',
  styleUrl: './auth-page.scss'
})
export class VerifyComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly state = signal<State>('checking');
  readonly message = signal('');
  readonly resent = signal(false);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('fail');
      this.message.set('Pautan tidak lengkap. Sila guna pautan penuh dari e-mel anda.');
      return;
    }

    this.auth.verify(token).subscribe({
      next: () => {
        this.state.set('ok');
        // beri masa untuk baca mesej, lepas tu masuk portal
        setTimeout(() => this.router.navigateByUrl(this.auth.landingRoute()), 2200);
      },
      error: e => {
        this.state.set('fail');
        this.message.set(e?.error?.message ?? 'Pautan tidak sah atau telah luput.');
      }
    });
  }

  goPortal() { this.router.navigateByUrl(this.auth.landingRoute()); }
}
