import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

/**
 * Tema portal — light (1b LIGHT & FRIENDLY) / dark (1a DARK FINTECH).
 * Kandungan sama; hanya palet bertukar melalui CSS variable.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly KEY = 'monthley-theme';

  readonly theme = signal<Theme>(this.initial());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem(ThemeService.KEY, t); } catch { /* abaikan */ }
    });
  }

  toggle() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  private initial(): Theme {
    try {
      const saved = localStorage.getItem(ThemeService.KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* abaikan */ }
    // ikut keutamaan sistem
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
