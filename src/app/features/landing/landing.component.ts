import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface Card { icon: string; title: string; desc: string; }
interface Faq { icon: string; q: string; a: string; }

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

  constructor() {
    // Mesej bertukar setiap 7 saat; berhenti bila FAQ dibuka.
    setInterval(() => {
      if (!this.faqOpen() && this.bubbleOpen()) {
        this.mascotIdx.update(i => (i + 1) % this.mascotMsgs.length);
      }
    }, 7000);
  }

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

  // ---------- Pembantu Monthley ----------

  readonly mascotOn = signal(true);
  readonly bubbleOpen = signal(true);
  readonly faqOpen = signal(false);

  /** Item FAQ yang terbuka; null bermakna semua tertutup. */
  readonly faqIdx = signal<number | null>(null);

  /**
   * Mesej gelembung berputar setiap 7 saat.
   *
   * Berhenti apabila panel FAQ dibuka — mesej yang bertukar di belakang
   * panel yang sedang dibaca menarik perhatian ke tempat yang salah.
   */
  readonly mascotIdx = signal(0);

  private readonly mascotMsgs = [
    'Hai! Saya pembantu Monthley 👋 Boleh saya bantu?',
    'Nak daftar organisasi? Klik Log Masuk di atas ya.',
    'Monthley sesuai untuk apa-apa kutipan berkala bulanan 💚',
    'Ada soalan? Tekan FAQ untuk kenali kami dengan lebih dekat.'
  ];

  mascotMsg(): string { return this.mascotMsgs[this.mascotIdx()]; }

  readonly faqs: Faq[] = [
    { icon: '💡', q: 'Apa itu Monthley?',
      a: 'Monthley ialah sistem bil & kutipan berkala dalam talian untuk mana-mana '
       + 'organisasi yang membuat kutipan bulanan — menggantikan buku resit, Excel dan '
       + 'kutipan tunai dengan satu portal yang teratur, cashless dan paperless.' },
    { icon: '⚙️', q: 'Bagaimana Monthley beroperasi?',
      a: 'Tiga langkah je. (1) Anda daftarkan produk/servis dan kadar caj. '
       + '(2) Daftarkan akaun pelanggan dan langgan produk kepada mereka. '
       + '(3) Monthley jana bil automatik setiap period, hantar kepada pelanggan, terima '
       + 'bayaran online, dan keluarkan resit sendiri — anda cuma pantau di dashboard.' },
    { icon: '🤖', q: 'Apa yang diautomasikan?',
      a: 'Penjanaan invois bulanan untuk semua akaun sekali gus, pengiraan tunggakan & '
       + 'baki terkumpul, penghantaran bil dan peringatan, pengeluaran resit sebaik '
       + 'bayaran diterima, kemas kini ledger dan penyata akaun, serta laporan kewangan '
       + 'yang terus terkini.' },
    { icon: '💳', q: 'Bagaimana pelanggan membuat bayaran?',
      a: 'Pelanggan log masuk ke portal mereka, pilih bil yang hendak dibayar (boleh '
       + 'beberapa bil sekali gus) dan bayar melalui FPX, kad atau e-wallet. Resit '
       + 'dijana serta-merta. Bayaran manual (tunai, cek, pindahan bank) juga boleh '
       + 'direkodkan oleh admin.' },
    { icon: '✨', q: 'Apa ciri-ciri utama Monthley?',
      a: 'Produk & kadar caj fleksibel (bulanan, tahunan, sekali sahaja, per guna), '
       + 'akaun pelanggan berbilang, penjanaan bil automatik & adhoc, dokumen kewangan '
       + '(invois, resit, penyelarasan), pengurusan perbelanjaan, aduan & memo, serta '
       + 'laporan termasuk Imbangan Duga dan Kunci Kira-kira.' },
    { icon: '🏆', q: 'Apa kelebihan Monthley?',
      a: 'Tiada lagi kutipan tunai yang berisiko atau resit hilang. Semua rekod kekal '
       + 'dan boleh diaudit. Anda tak perlu ilmu perakaunan — sistem yang kira. Kutipan '
       + 'meningkat sebab bil sampai tepat pada masanya dan pelanggan boleh bayar '
       + 'bila-bila, di mana-mana.' },
    { icon: '📈', q: 'Apa manfaat yang organisasi dapat?',
      a: 'Jimat masa kerja perkeranian setiap bulan, aliran tunai lebih cepat dan mudah '
       + 'dijangka, tunggakan lebih mudah dikesan, laporan sedia untuk mesyuarat dan '
       + 'juruaudit, serta kepercayaan ahli meningkat kerana setiap sen ada rekodnya.' },
    { icon: '🏢', q: 'Siapa sesuai guna Monthley?',
      a: 'Mana-mana organisasi yang membuat kutipan berkala — JMB/MC & pengurusan '
       + 'strata, persatuan penduduk, nurseri, tadika & sekolah, bas sekolah, gim & '
       + 'kelab, persatuan dan NGO, SME dengan langganan bulanan, dan pemilik hartanah '
       + 'yang mengutip sewa.' },
    { icon: '👥', q: 'Adakah pelanggan saya juga dapat akses?',
      a: 'Ya. Setiap pelanggan dapat portal sendiri untuk melihat bil dan baki, membayar '
       + 'online, memuat turun resit, menyemak sejarah bayaran, menghantar aduan dan '
       + 'membaca memo. Satu log masuk boleh melihat beberapa akaun sekali gus.' },
    { icon: '🧾', q: 'Sistem ini sedia untuk tax invois 2027?',
      a: 'Ya. Monthley menyokong tetapan cukai jualan dan format tax invois yang '
       + 'diperlukan, jadi organisasi anda sudah bersedia apabila keperluan tax invois '
       + 'berkuat kuasa mulai Januari 2027.' },
    { icon: '🔐', q: 'Selamat ke data kami?',
      a: 'Setiap organisasi mempunyai ruang data tersendiri dengan kawalan peranan '
       + 'pengguna. Akses ditentukan mengikut peranan — admin melihat modul pengurusan, '
       + 'pelanggan hanya melihat akaun mereka sendiri.' },
    { icon: '🚀', q: 'Bagaimana untuk mula?',
      a: 'Tekan "Mula Sekarang" dan tinggalkan maklumat anda. Pasukan kami akan hubungi '
       + 'untuk sesi demo, bantu sediakan profil organisasi, produk dan senarai akaun '
       + 'pelanggan — selepas itu kutipan pertama boleh dijana pada bulan yang sama.' }
  ];

  toggleFaq() {
    const buka = !this.faqOpen();
    this.faqOpen.set(buka);
    // Gelembung dan panel tidak muncul serentak — dua kotak hijau
    // bertindih di sudut yang sama.
    this.bubbleOpen.set(!buka);
  }

  closeFaq() { this.faqOpen.set(false); this.bubbleOpen.set(true); }

  toggleFaqItem(i: number) {
    this.faqIdx.set(this.faqIdx() === i ? null : i);
  }

  hideBubble(e: Event) {
    e.stopPropagation();
    this.bubbleOpen.set(false);
  }

  // ---------- Seret mascot ----------

  /**
   * Kedudukan mascot, diukur dari kiri-bawah skrin.
   *
   * Mascot menutup kandungan di sudut kiri bawah, jadi pengguna perlu
   * boleh mengalihkannya. Kedudukan disimpan kerana pengguna yang
   * mengalihkannya ada sebab — mengembalikannya setiap lawatan bermakna
   * mereka kena buat berulang.
   */
  readonly pos = signal<{ left: number; bottom: number }>(this.bacaKedudukan());

  private drag: { x: number; y: number; left: number; bottom: number } | null = null;

  /**
   * BENAR hanya selepas tetikus bergerak melebihi ambang.
   *
   * Tanpa ambang, setiap seretan juga mencetuskan klik dan panel FAQ
   * terbuka setiap kali mascot dialihkan. Lima piksel cukup untuk
   * membezakan niat tanpa terasa lengai.
   */
  private bergerak = false;

  private static readonly AMBANG = 5;
  private static readonly KUNCI = 'monthley.mascot.pos';

  private bacaKedudukan(): { left: number; bottom: number } {
    try {
      const v = localStorage.getItem(LandingComponent.KUNCI);
      if (v) {
        const p = JSON.parse(v);
        if (typeof p?.left === 'number' && typeof p?.bottom === 'number') return p;
      }
    } catch { /* storan disekat — guna lalai */ }
    return { left: 26, bottom: 26 };
  }

  private simpanKedudukan() {
    try {
      localStorage.setItem(LandingComponent.KUNCI, JSON.stringify(this.pos()));
    } catch { /* storan disekat — kedudukan hilang bila halaman ditutup */ }
  }

  mulaSeret(e: PointerEvent) {
    // Butang kanan dan sentuhan berbilang jari bukan seretan.
    if (e.button !== 0) return;

    this.bergerak = false;
    this.drag = {
      x: e.clientX, y: e.clientY,
      left: this.pos().left, bottom: this.pos().bottom
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  semasaSeret(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;

    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;

    if (!this.bergerak
        && Math.abs(dx) < LandingComponent.AMBANG
        && Math.abs(dy) < LandingComponent.AMBANG) {
      return;
    }
    this.bergerak = true;

    // Dihadkan dalam viewport supaya mascot tidak boleh diseret keluar
    // skrin dan hilang selama-lamanya.
    const maxLeft = Math.max(0, window.innerWidth - 180);
    const maxBottom = Math.max(0, window.innerHeight - 200);

    this.pos.set({
      left: Math.min(maxLeft, Math.max(0, d.left + dx)),
      bottom: Math.min(maxBottom, Math.max(0, d.bottom - dy))
    });
  }

  habisSeret(e: PointerEvent) {
    if (!this.drag) return;
    this.drag = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    if (this.bergerak) {
      this.simpanKedudukan();
    } else {
      // Tiada gerakan bermakna ia klik, bukan seretan.
      this.toggleFaq();
    }
    this.bergerak = false;
  }

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

  /**
   * Kata laluan boleh dilihat.
   *
   * Pendaftaran hanya meminta kata laluan SEKALI — tiada medan sahkan —
   * jadi tersalah taip tidak akan ditangkap sehingga log masuk pertama
   * gagal. Membenarkan pengguna melihat apa yang ditaip menggantikan
   * medan kedua itu.
   */
  readonly showLoginPw = signal(false);
  readonly showRegPw = signal(false);

  /**
   * Nombor telefon Malaysia.
   *
   * Menerima 9-11 digit dengan pemisah pilihan: 0123456789,
   * 012-345 6789, +60123456789. Disimpan sebagai digit sahaja.
   *
   * Sebelum ini medan menerima apa-apa teks — '0189898jhjgu7878' lulus,
   * dan nombor itu hanya ditemui rosak apabila SMS atau WhatsApp gagal
   * dihantar berbulan kemudian.
   */
  private static readonly TEL = /^(?:\+?60|0)[0-9]{8,10}$/;

  telefonSah(v: string): boolean {
    const bersih = (v || '').replace(/[\s()-]/g, '');
    return LandingComponent.TEL.test(bersih);
  }

  /** Buang pemisah supaya yang disimpan konsisten. */
  private telefonBersih(v: string): string {
    return (v || '').replace(/[\s()-]/g, '');
  }

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
    // Telefon disemak SEBELUM menghantar. Medan pilihan, tetapi kalau
    // diisi ia mesti nombor sebenar — nombor rosak hanya ditemui apabila
    // penghantaran gagal berbulan kemudian.
    if (this.rMobile.trim() && !this.telefonSah(this.rMobile)) {
      this.authError.set('No. telefon tidak sah. Contoh: 0123456789');
      return;
    }
    if (this.rPassword.length < 6) {
      this.authError.set('Kata laluan mesti sekurang-kurangnya 6 aksara.');
      return;
    }

    this.busy.set(true);
    this.authError.set(null);
    this.auth.register({
      fullName: this.rName, email: this.rEmail,
      mobile: this.telefonBersih(this.rMobile), password: this.rPassword
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
