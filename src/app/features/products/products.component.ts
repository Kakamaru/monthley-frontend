import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/product.model';
import { ProductsService, ProductCategory, Subscriber, BulkLine } from './products.service';
import { AccountsService } from '../accounts/accounts.service';
import { SpContextService } from '../../core/services/sp-context.service';
import { Account } from '../../core/models/account.model';
import { binaCsv, muatTurunCsv } from '../../core/csv';
import { tarikhIso } from '../../core/tarikh';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
  private api = inject(ProductsService);
  /**
   * Senarai akaun datang daripada AccountsService, bukan salinan dalam
   * ProductsService: carian nama, nombor akaun dan kategori sudah wujud
   * di sana, dan dua laluan ke senarai akaun yang sama akan menyimpang.
   */
  private accounts = inject(AccountsService);
  /**
   * Peranan untuk menyembunyikan butang yang backend akan tolak.
   *
   * Menyembunyikan BUKAN keselamatan — peraturan sebenar hidup pada
   * setiap endpoint. Tetapi VIEWER yang menekan butang dan mendapat
   * ralat ialah pengalaman yang buruk.
   */
  readonly sp = inject(SpContextService);

  /** grid columns — sama dengan prototaip */
  readonly cols = '0.6fr 1fr 1.1fr 1.4fr 0.8fr 0.9fr 0.7fr 150px';

  readonly activeTab = signal(true);
  readonly rows = signal<Product[]>([]);
  readonly categories = signal<ProductCategory[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  searchName = '';
  category: number | null = null;

  // ── Menu tindakan + modal pelanggan ──────────────────────────────

  /** id produk yang menunya terbuka; null = tiada. */
  readonly menuOpen = signal<number | null>(null);

  readonly subsOpen = signal(false);
  readonly subsProduct = signal<Product | null>(null);
  readonly subsRows = signal<Subscriber[]>([]);
  readonly subsTotal = signal(0);
  readonly subsAktif = signal(0);
  readonly subsPage = signal(0);
  readonly subsLoading = signal(false);
  readonly subsSize = 10;

  readonly subsTotalPages = computed(
    () => Math.max(1, Math.ceil(this.subsTotal() / this.subsSize)));

  readonly subsExporting = signal(false);

  // ── Add Account: dua langkah ─────────────────────────────────────
  //
  // Langkah 1 memilih akaun; langkah 2 mengesahkan dengan kuantiti dan
  // tarikh boleh sunting per baris. Menggabungkannya bermakna kerani
  // menetapkan tarikh pada akaun yang mungkin tidak jadi dipilih.

  /**
   * Kategori AKAUN, bukan kategori produk.
   *
   * categories() dalam komponen ini memegang kategori PRODUK, dan
   * kedua-dua servis mempunyai kaedah bernama categories() — jadual
   * berbeza, konsep berbeza, nama sama. Draf pertama dialog ini
   * menggunakan yang salah.
   */
  readonly akaunCategories = signal<{ id: number; name: string }[]>([]);

  readonly addOpen = signal(false);
  readonly addProduct = signal<Product | null>(null);
  readonly addStep = signal<1 | 2>(1);

  readonly addRows = signal<Account[]>([]);
  readonly addTotal = signal(0);
  readonly addPage = signal(0);
  readonly addLoading = signal(false);
  readonly addSize = 10;

  /** Akaun dipilih — kekal merentas halaman dan carian. */
  readonly addPicked = signal<Map<number, Account>>(new Map());
  readonly addLines = signal<BulkLine[]>([]);
  readonly addBusy = signal(false);
  readonly addResult = signal<string | null>(null);

  addNama = '';
  addNoAkaun = '';
  addKategori: number | null = null;

  /** Set semua — kuantiti dan tarikh dipakai pada setiap baris. */
  semuaQty: number | null = 1;
  semuaStart = '';
  semuaEnd = '';

  readonly addTotalPages = computed(
    () => Math.max(1, Math.ceil(this.addTotal() / this.addSize)));

  // ── Nyahaktif / aktifkan ─────────────────────────────────────────

  readonly statusOpen = signal(false);
  readonly statusProduct = signal<Product | null>(null);
  /** Bilangan akaun yang melanggan — dibaca sebelum dialog dipapar. */
  readonly statusPelanggan = signal<number | null>(null);
  readonly statusBusy = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  readonly pageLabel = computed(() => {
    const t = this.total();
    const from = t ? this.page() * this.size() + 1 : 0;
    const to = Math.min(this.page() * this.size() + this.size(), t);
    return `Menunjukkan ${from}–${to} daripada ${t}`;
  });

  constructor() {
    this.loadCategories();
    this.load();
  }

  // ── Menu tindakan ────────────────────────────────────────────────

  toggleMenu(id: number) {
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  // ── Add Account ──────────────────────────────────────────────────

  /** Nama kategori AKAUN — bukan categoryName() yang untuk produk. */
  namaKategoriAkaun(id?: number | null): string {
    if (id == null) return '—';
    return this.akaunCategories().find(c => c.id === id)?.name ?? '—';
  }

  bukaAdd(p: Product) {
    this.menuOpen.set(null);
    if (this.akaunCategories().length === 0) {
      this.accounts.categories().subscribe({
        next: c => this.akaunCategories.set(c), error: () => {}
      });
    }
    this.addProduct.set(p);
    this.addStep.set(1);
    this.addPicked.set(new Map());
    this.addLines.set([]);
    this.addResult.set(null);
    this.addNama = ''; this.addNoAkaun = ''; this.addKategori = null;
    this.semuaQty = 1; this.semuaStart = ''; this.semuaEnd = '';
    this.addPage.set(0);
    this.addOpen.set(true);
    this.muatAkaun();
  }

  tutupAdd() {
    this.addOpen.set(false);
    this.addProduct.set(null);
  }

  addCari() { this.addPage.set(0); this.muatAkaun(); }

  addGoPage(n: number) {
    if (n < 0 || n >= this.addTotalPages()) return;
    this.addPage.set(n);
    this.muatAkaun();
  }

  private soalan(page: number, size: number) {
    const p = this.addProduct();
    const q = [this.addNama, this.addNoAkaun].filter(Boolean).join(' ').trim();
    return {
      active: true,
      category: this.addKategori,
      // Senarai = "siapa boleh ditambah". Akaun yang sudah melanggan
      // tidak muncul; View Account wujud untuk menyemaknya.
      excludeProduct: p?.id ?? null,
      q: q || null,
      page, size
    };
  }

  private muatAkaun() {
    if (!this.addProduct()) return;
    this.addLoading.set(true);
    this.accounts.list(this.soalan(this.addPage(), this.addSize)).subscribe({
      next: r => {
        this.addRows.set(r.items);
        this.addTotal.set(r.total);
        this.addLoading.set(false);
      },
      error: () => { this.addRows.set([]); this.addLoading.set(false); }
    });
  }

  addDipilih(id: number) { return this.addPicked().has(id); }

  addToggle(a: Account) {
    const m = new Map(this.addPicked());
    if (m.has(a.id!)) m.delete(a.id!); else m.set(a.id!, a);
    this.addPicked.set(m);
  }

  /**
   * Pilih SEMUA hasil carian, bukan halaman semasa.
   *
   * Label mengatakan "hasil carian", dan memilih sepuluh daripada
   * seratus dua puluh lapan menjadikan ciri pukal tidak pukal.
   */
  addPilihSemua() {
    this.addLoading.set(true);
    this.accounts.list(this.soalan(0, 5000)).subscribe({
      next: r => {
        const m = new Map(this.addPicked());
        r.items.forEach(a => m.set(a.id!, a));
        this.addPicked.set(m);
        this.addLoading.set(false);
      },
      error: () => this.addLoading.set(false)
    });
  }

  addBuangSemua() { this.addPicked.set(new Map()); }

  addSeterusnya() {
    if (this.addPicked().size === 0) return;
    this.addLines.set([...this.addPicked().values()].map(a => ({
      accountId: a.id!,
      quantity: 1,
      startDate: null,
      endDate: null
    })));
    this.addStep.set(2);
  }

  addKembali() { this.addStep.set(1); }

  namaAkaun(id: number) { return this.addPicked().get(id)?.name ?? ''; }
  noAkaun(id: number) { return this.addPicked().get(id)?.no ?? ''; }

  /** Set semua — kerani masih boleh menukar baris tertentu selepasnya. */
  addSetSemua() {
    this.addLines.set(this.addLines().map(l => ({
      ...l,
      quantity: this.semuaQty,
      startDate: this.semuaStart || null,
      endDate: this.semuaEnd || null
    })));
  }

  addSimpan() {
    const p = this.addProduct();
    if (!p || this.addBusy()) return;

    this.addBusy.set(true);
    this.api.bulkSubscribe(p.id!, this.addLines()).subscribe({
      next: r => {
        this.addBusy.set(false);
        if (r.dilangkau > 0) {
          // Dilangkau bukan ralat — senarai boleh basi antara memuat
          // dan menyimpan. Kerani perlu tahu berapa dan mengapa.
          this.addResult.set(`${r.ditambah} ditambah, ${r.dilangkau} dilangkau. `
            + r.sebab.slice(0, 3).join(' '));
        } else {
          this.tutupAdd();
        }
        this.load();
      },
      error: () => this.addBusy.set(false)
    });
  }

  // ── Nyahaktif / aktifkan ─────────────────────────────────────────

  /**
   * Buka dialog pengesahan.
   *
   * Bilangan pelanggan dibaca DAHULU dan dipaparkan: kerani yang
   * menyahaktifkan produk tanpa sedar enam akaun berhenti dibil akan
   * perasan bulan depan apabila hasil turun.
   */
  bukaStatus(p: Product) {
    this.menuOpen.set(null);
    this.statusProduct.set(p);
    this.statusPelanggan.set(null);
    this.statusOpen.set(true);

    if (p.active) {
      this.api.subscribers(p.id!, 0, 1).subscribe({
        next: r => this.statusPelanggan.set(r.total),
        error: () => this.statusPelanggan.set(null)
      });
    }
  }

  tutupStatus() {
    this.statusOpen.set(false);
    this.statusProduct.set(null);
  }

  sahkanStatus() {
    const p = this.statusProduct();
    if (!p || this.statusBusy()) return;

    this.statusBusy.set(true);
    this.api.setStatus(p.id!, !p.active).subscribe({
      next: () => {
        this.statusBusy.set(false);
        this.tutupStatus();
        // Produk berpindah ke tab lain, jadi senarai semasa berubah.
        this.load();
      },
      error: () => this.statusBusy.set(false)
    });
  }

  // ── View Account ─────────────────────────────────────────────────

  bukaPelanggan(p: Product) {
    this.menuOpen.set(null);
    this.subsProduct.set(p);
    this.subsPage.set(0);
    this.subsOpen.set(true);
    this.muatPelanggan();
  }

  tutupPelanggan() {
    this.subsOpen.set(false);
    this.subsRows.set([]);
  }

  subsGoPage(n: number) {
    if (n < 0 || n >= this.subsTotalPages()) return;
    this.subsPage.set(n);
    this.muatPelanggan();
  }

  /**
   * Eksport SEMUA pelanggan, bukan halaman semasa.
   *
   * Kerani di halaman satu daripada tiga belas yang memuat turun
   * sepuluh baris mendapat fail yang tidak berguna, dan tiada apa
   * memberitahunya bahawa selebihnya hilang.
   */
  eksportPelanggan() {
    const p = this.subsProduct();
    if (!p || this.subsExporting()) return;

    this.subsExporting.set(true);
    // 5000: cukup untuk setiap SP yang kita tahu. Kalau ia dilanggar,
    // eksport perlukan penstriman, bukan had yang lebih besar.
    this.api.subscribers(p.id!, 0, 5000).subscribe({
      next: r => {
        const csv = binaCsv(
          ['Akaun', 'Nama', 'Kategori', 'Kuantiti', 'Melanggan Sejak', 'Status'],
          r.items.map(s => [
            s.accountNo, s.accountName, s.categoryName ?? '',
            s.quantity, s.startDate ?? '',
            s.accountActive ? 'Aktif' : 'Tidak Aktif'
          ]));
        muatTurunCsv(`pelanggan-${p.code}-${tarikhIso()}.csv`, csv);
        this.subsExporting.set(false);
      },
      error: () => this.subsExporting.set(false)
    });
  }

  private muatPelanggan() {
    const p = this.subsProduct();
    if (!p) return;
    this.subsLoading.set(true);
    this.api.subscribers(p.id!, this.subsPage(), this.subsSize).subscribe({
      next: r => {
        this.subsRows.set(r.items);
        this.subsTotal.set(r.total);
        this.subsAktif.set(r.aktif);
        this.subsLoading.set(false);
      },
      error: () => {
        this.subsRows.set([]);
        this.subsLoading.set(false);
      }
    });
  }

  loadCategories() {
    this.api.categories().subscribe({
      next: c => this.categories.set(c),
      error: () => this.categories.set([])
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({
      active: this.activeTab(),
      category: this.category,
      q: this.searchName || null,
      page: this.page(),
      size: this.size()
    }).subscribe({
      next: r => { this.rows.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: e => {
        this.error.set('Gagal memuatkan produk. Pastikan backend berjalan di :8080.');
        this.loading.set(false);
        console.error(e);
      }
    });
  }

  switchTab(active: boolean) {
    if (this.activeTab() === active) return;
    this.activeTab.set(active);
    this.page.set(0);
    this.load();
  }

  search() { this.page.set(0); this.load(); }

  clear() {
    this.searchName = '';
    this.category = null;
    this.page.set(0);
    this.load();
  }

  goPage(p: number) {
    if (p < 0 || p >= this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  pageNumbers(): number[] {
    return Array.from({ length: Math.min(this.totalPages(), 5) }, (_, i) => i);
  }

  categoryName(id?: number | null): string {
    if (id == null) return '—';
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  // ── Borang Add/Edit Product ──────────────────────────────────
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  editingId: number | null = null;

  // draft borang — nilai lalai padan design
  draft: {
    mainProduct: boolean; mandatory: boolean; prorated: boolean; latePenalty: boolean;
    code: string; categoryId: number | null; name: string; description: string;
    rate: number | null; chargeFrequency: string; anchorMonth: number | null;
  } = this.blankDraft();

  private blankDraft() {
    return {
      mainProduct: false, mandatory: false, prorated: false, latePenalty: false,
      code: '', categoryId: null, name: '', description: '',
      rate: null, chargeFrequency: 'MONTHLY', anchorMonth: null
    };
  }

  /** 6 frekuensi — Non-Recurring dibuang (= One Time). */
  readonly freqOptions = [
    { value: 'ONE_TIME',  label: 'One Time' },
    { value: 'MONTHLY',   label: 'Monthly Charge' },
    { value: 'QUARTERLY', label: 'Quarterly Charge' },
    { value: 'HALF_YEAR', label: 'Half Yearly Charge' },
    { value: 'YEAR',      label: 'Yearly Charge' },
    { value: 'PER_USE',   label: 'Per Use' }
  ];

  readonly bulanList = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Mac' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Julai' }, { value: 8, label: 'Ogos' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Disember' }
  ];

  /** Anchor hanya bermakna untuk kitaran > 1 bulan. */
  showAnchor(): boolean {
    return ['QUARTERLY', 'HALF_YEAR', 'YEAR'].includes(this.draft.chargeFrequency);
  }

  openAdd() {
    this.editingId = null;
    this.draft = this.blankDraft();
    this.formOpen.set(true);
  }

  closeForm() { this.formOpen.set(false); }

  openEdit(p: Product) {
    this.editingId = p.id;
    this.draft = {
      mainProduct: p.mainProduct,
      mandatory: p.mandatory,
      prorated: p.prorated,
      latePenalty: p.latePenalty,
      code: p.code,
      categoryId: p.categoryId ?? null,
      name: p.name,
      description: p.description ?? '',
      rate: p.rate,
      chargeFrequency: p.chargeFrequency,
      anchorMonth: p.anchorMonth ?? null
    };
    this.formOpen.set(true);
  }

  saveProduct() {
    if (!this.draft.code.trim() || !this.draft.name.trim() || this.draft.rate == null) {
      this.error.set('Kod, Nama dan Rate wajib diisi.');
      return;
    }
    this.saving.set(true);
    const body = {
      code: this.draft.code.trim(),
      name: this.draft.name.trim(),
      rate: this.draft.rate,
      chargeFrequency: this.draft.chargeFrequency as any,
      // anchor hanya dihantar bila relevan
      anchorMonth: this.showAnchor() ? this.draft.anchorMonth ?? undefined : undefined,
      categoryId: this.draft.categoryId ?? undefined,
      prorated: this.draft.prorated,
      latePenalty: this.draft.latePenalty,
      mandatory: this.draft.mandatory,
      mainProduct: this.draft.mainProduct,
      description: this.draft.description || undefined
    };
    const done = () => { this.saving.set(false); this.formOpen.set(false); this.page.set(0); this.load(); };
    const fail = (e: any) => { this.saving.set(false); this.error.set('Gagal menyimpan produk.'); console.error(e); };

    if (this.editingId == null) {
      this.api.create(body).subscribe({ next: done, error: fail });
    } else {
      this.api.update(this.editingId, body).subscribe({ next: done, error: fail });
    }
  }

  freqLabel(f: string): string {
    const map: Record<string, string> = {
      MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', HALF_YEAR: 'Half Year',
      YEAR: 'Yearly', ONE_TIME: 'One Off', PER_USE: 'Per Used'
    };
    return map[f] ?? f;
  }
}
