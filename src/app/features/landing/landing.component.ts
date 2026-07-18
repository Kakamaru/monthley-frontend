import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface Card { icon: string; title: string; desc: string; }

/**
 * Landing — konsep "1a · DARK FINTECH" dari prototaip.
 * Sengaja gelap sahaja (bukan bertema) — butang lampu ada di portal.
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly loginOpen = signal(false);
  readonly registerOpen = signal(false);
  readonly contactOpen = signal(false);
  readonly busy = signal(false);
  readonly authError = signal<string | null>(null);
  readonly forgotOpen = signal(false);
  readonly registered = signal<string | null>(null);   // e-mel yang baru daftar
  readonly forgotSent = signal(false);
  readonly needVerify = signal(false);
  readonly resendOk = signal(false);

  /** Masalah cara manual — 3 kad */
  readonly problems: Card[] = [
    { icon: '✕', title: 'Membuat bil makan masa',
      desc: 'Kira manual guna buku & Excel, satu-satu. Pembayaran separa merumitkan kiraan.' },
    { icon: '✕', title: 'Sukar kesan tunggakan',
      desc: 'Risiko ketirisan & kerugian pendapatan yang sukar dikesan.' },
    { icon: '✕', title: 'Masa terbuang layan soalan',
      desc: '"Saya dah bayar ke belum?" berulang. Resit hilang, minta cetak semula.' }
  ];

  /** Penyelesaian — 3 item */
  readonly solutions: Card[] = [
    { icon: '✓', title: 'Bil & kutipan dijana automatik',
      desc: 'Jana bil berkala, rekod kutipan & akaun pelanggan tanpa kerja manual.' },
    { icon: '✓', title: 'Pemantauan 2 hala',
      desc: 'Organisasi & pelanggan lihat rekod yang sama — tiada salah faham.' },
    { icon: '✓', title: 'Telus & elak ketirisan',
      desc: 'Setiap transaksi ada jejak audit — pendapatan terjaga.' }
  ];

  /** 8 sektor */
  readonly sectors = [
    { icon: '🏢', label: 'Komuniti JMB / MC' },
    { icon: '🏘️', label: 'Persatuan Penduduk' },
    { icon: '🔑', label: 'Sublet' },
    { icon: '🧸', label: 'Nurseri' },
    { icon: '🎒', label: 'Tadika / Tahfiz' },
    { icon: '🚌', label: 'Bas Sekolah' },
    { icon: '⚽', label: 'Kelab & Persatuan' },
    { icon: '🕌', label: 'PASTI / SRITI' }
  ];

  /** 6 ciri utama */
  readonly features: Card[] = [
    { icon: '🔄', title: 'Automasi bil & kutipan', desc: 'Jana bil, rekod kutipan & akaun pelanggan secara automatik.' },
    { icon: '☁️', title: 'Teknologi cloud',        desc: 'Akses di mana-mana, data selamat & sentiasa dikemas kini.' },
    { icon: '💳', title: 'Cashless & paperless',   desc: 'Pembayaran online, transaksi tanpa tunai & tanpa kertas.' },
    { icon: '🛡️', title: 'Elak ketirisan',         desc: 'Kurangkan risiko kebocoran & kerugian dalam pendapatan.' },
    { icon: '🕐', title: 'Layan diri 24/7',        desc: 'Pelanggan urus bil & bayaran sendiri, bila-bila masa.' },
    { icon: '👍', title: 'Tanpa ilmu perakaunan',  desc: 'Mudah diguna — tak perlu latar belakang akaun.' }
  ];

  // borang log masuk
  loginId = '';
  loginPassword = '';

  // borang lupa kata laluan
  fEmail = '';

  // borang daftar
  rName = ''; rEmail = ''; rMobile = ''; rPassword = '';

  // borang hubungi
  cName = ''; cEmail = ''; cPhone = ''; cOrg = '';
  cSubject = 'Nak mula guna Monthley'; cMessage = '';

  login() {
    this.busy.set(true);
    this.authError.set(null);
    this.auth.login(this.loginId, this.loginPassword).subscribe({
      next: () => {
        this.busy.set(false);
        this.loginOpen.set(false);
        this.router.navigateByUrl(this.auth.landingRoute());
      },
      error: e => {
        this.busy.set(false);
        this.needVerify.set(e?.status === 403);
        this.authError.set(e?.error?.message ?? 'Log masuk gagal. Cuba lagi.');
      }
    });
  }

  resendVerification() {
    this.auth.resendVerification(this.loginId).subscribe({
      next: () => { this.resendOk.set(true); this.needVerify.set(false); },
      error: () => this.resendOk.set(true)
    });
  }

  forgotPassword() {
    this.busy.set(true);
    this.authError.set(null);
    this.auth.forgotPassword(this.fEmail).subscribe({
      next: () => { this.busy.set(false); this.forgotSent.set(true); },
      error: () => { this.busy.set(false); this.forgotSent.set(true); }
    });
  }

  openForgot() {
    this.loginOpen.set(false);
    this.forgotSent.set(false);
    this.authError.set(null);
    this.fEmail = this.loginId;
    this.forgotOpen.set(true);
  }

  register() {
    this.busy.set(true);
    this.authError.set(null);
    this.auth.register({
      fullName: this.rName, email: this.rEmail,
      mobile: this.rMobile, password: this.rPassword
    }).subscribe({
      next: r => {
        this.busy.set(false);
        this.registered.set(r.email);   // papar skrin "semak e-mel"
      },
      error: e => {
        this.busy.set(false);
        this.authError.set(e?.error?.message ?? 'Pendaftaran gagal. Cuba lagi.');
      }
    });
  }

  closeRegister() {
    this.registerOpen.set(false);
    this.registered.set(null);
    this.rName = ''; this.rEmail = ''; this.rMobile = ''; this.rPassword = '';
  }

  openRegister() {
    this.loginOpen.set(false);
    this.authError.set(null);
    this.registered.set(null);
    this.registerOpen.set(true);
  }

  openLogin() {
    this.registerOpen.set(false);
    this.forgotOpen.set(false);
    this.authError.set(null);
    this.needVerify.set(false);
    this.resendOk.set(false);
    this.loginOpen.set(true);
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
