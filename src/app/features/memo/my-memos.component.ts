import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoService, MyMemo } from './memo.service';

@Component({
  selector: 'app-my-memos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-memos.component.html',
  styleUrl: '../expenses/expenses.scss'
})
export class MyMemosComponent {
  private api = inject(MemoService);

  readonly rows = signal<MyMemo[]>([]);
  readonly loading = signal(false);
  readonly scope = signal<'ACTIVE' | 'PAST'>('ACTIVE');

  /**
   * Memo yang sedang dibaca penuh.
   *
   * Sama seperti sisi SP: isi dipotong pada kad supaya satu memo panjang
   * tidak menolak semua yang lain, dan modal untuk membaca penuh supaya
   * susunan grid tidak melompat.
   */
  readonly readOpen = signal<MyMemo | null>(null);

  panjang(m: MyMemo): boolean {
    return m.body.length > 260 || m.body.split('\n').length > 5;
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.readOpen()) this.readOpen.set(null); }

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.mine(this.scope()).subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); }
    });
  }

  setScope(s: 'ACTIVE' | 'PAST') { this.scope.set(s); this.load(); }

  bila(iso: string | null): string {
    if (!iso) return '—';
    return iso.replace('T', ' ').slice(0, 10);
  }
}
