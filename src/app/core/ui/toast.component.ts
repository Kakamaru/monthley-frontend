import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-host">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast" [class]="t.kind" (click)="svc.dismiss(t.id)">
          <span class="t-ic">{{ icon(t) }}</span>
          <div class="t-body">
            <div class="t-msg">{{ t.message }}</div>
            @if (t.detail) { <div class="t-detail">{{ t.detail }}</div> }
          </div>
          <button class="t-x" (click)="svc.dismiss(t.id); $event.stopPropagation()">✕</button>
          <div class="t-bar"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Tengah skrin — supaya pengguna nampak jelas. */
    .toast-host {
      position: fixed; inset: 0; z-index: 200;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; pointer-events: none;
    }
    .toast {
      pointer-events: auto; position: relative; overflow: hidden;
      display: flex; align-items: flex-start; gap: 14px;
      min-width: 360px; max-width: 460px;
      background: var(--surface); border: 1px solid var(--line);
      border-radius: 14px; padding: 18px 18px 19px;
      box-shadow: 0 24px 56px rgba(18,32,41,.28);
      cursor: pointer; animation: t-in .26s cubic-bezier(.2,.7,.3,1);
    }
    .toast.success { border-left: 4px solid var(--green); }
    .toast.error   { border-left: 4px solid var(--red); }
    .toast.warn    { border-left: 4px solid var(--orange); }
    .toast.info    { border-left: 4px solid var(--muted); }

    .t-ic { font-size: 20px; line-height: 1.2; flex: none; }
    .t-body { flex: 1; min-width: 0; }
    .t-msg {
      font-family: 'Sora', sans-serif; font-weight: 700;
      font-size: 15px; color: var(--ink); line-height: 1.45;
    }
    .t-detail { font-size: 13px; color: var(--muted); margin-top: 4px; line-height: 1.55; }
    .t-x {
      flex: none; border: none; background: transparent; color: var(--muted);
      font-size: 12px; cursor: pointer; padding: 2px 4px; border-radius: 5px;
      &:hover { background: var(--surface-alt); color: var(--ink); }
    }

    /* bar masa — mengecut selama 7s */
    .t-bar {
      position: absolute; left: 0; bottom: 0; height: 3px; width: 100%;
      transform-origin: left; animation: t-timer 7s linear forwards;
    }
    .toast.success .t-bar { background: var(--green); }
    .toast.error   .t-bar { background: var(--red); }
    .toast.warn    .t-bar { background: var(--orange); }
    .toast.info    .t-bar { background: var(--muted); }

    @keyframes t-in {
      from { opacity: 0; transform: scale(.92) translateY(10px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes t-timer { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `]
})
export class ToastComponent {
  readonly svc = inject(ToastService);

  icon(t: Toast): string {
    switch (t.kind) {
      case 'success': return '✅';
      case 'error':   return '⛔';
      case 'warn':    return '⚠️';
      default:        return 'ℹ️';
    }
  }
}
