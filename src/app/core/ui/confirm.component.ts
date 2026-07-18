import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (svc.pending(); as c) {
      <div class="c-backdrop" (click)="svc.answer(false)">
        <div class="c-box" (click)="$event.stopPropagation()">
          <div class="c-ic" [class.danger]="c.danger">{{ c.danger ? '🗑' : '❓' }}</div>
          <h3>{{ c.title }}</h3>
          <p class="c-msg">{{ c.message }}</p>
          @if (c.detail) { <p class="c-detail">{{ c.detail }}</p> }

          <div class="c-actions">
            <button class="c-btn ghost" (click)="svc.answer(false)">
              {{ c.cancelText || 'Tidak' }}
            </button>
            <button class="c-btn" [class.danger]="c.danger" [class.green]="!c.danger"
                    (click)="svc.answer(true)">
              {{ c.confirmText || 'Ya' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .c-backdrop {
      position: fixed; inset: 0; z-index: 210;
      background: rgba(9,18,23,.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; padding: 40px;
      animation: c-fade .18s ease;
    }
    .c-box {
      width: 400px; background: var(--surface); border: 1px solid var(--line);
      border-radius: 18px; padding: 30px 28px; text-align: center;
      box-shadow: 0 30px 70px rgba(0,0,0,.32);
      animation: c-pop .22s cubic-bezier(.2,.7,.3,1);
    }
    .c-ic {
      width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 16px;
      display: flex; align-items: center; justify-content: center; font-size: 24px;
      background: var(--surface-alt);
      &.danger { background: rgba(214,69,69,.12); }
    }
    h3 {
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 19px;
      margin: 0 0 8px; color: var(--ink);
    }
    .c-msg { font-size: 14.5px; color: var(--ink); margin: 0 0 6px; line-height: 1.5; }
    .c-detail { font-size: 13px; color: var(--muted); margin: 0; line-height: 1.5; }

    .c-actions { display: flex; gap: 10px; margin-top: 24px; }
    .c-btn {
      flex: 1; padding: 12px; border-radius: 10px; border: none; cursor: pointer;
      font-family: 'Sora', sans-serif; font-weight: 700; font-size: 14px;
      transition: filter .16s ease;
      &.ghost {
        background: var(--surface); color: var(--muted);
        border: 1.5px solid var(--line-input);
        &:hover { background: var(--surface-alt); color: var(--ink); }
      }
      &.green  { background: var(--green); color: #fff; &:hover { filter: brightness(1.06); } }
      &.danger { background: var(--red); color: #fff; &:hover { filter: brightness(1.06); } }
    }

    @keyframes c-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes c-pop {
      from { opacity: 0; transform: scale(.94) translateY(8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class ConfirmComponent {
  readonly svc = inject(ConfirmService);
}
