import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Suis Yes/No bersegmen — nilai tepat dari design.
 * Guna: <app-yesno [(ngModel)]="nilai" />
 */
@Component({
  selector: 'app-yesno',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => YesNoComponent),
    multi: true
  }],
  template: `
    <div class="yn" [class.off]="disabled">
      <button type="button" class="yn-opt" [class.on]="value === true"
              (click)="pick(true)" [disabled]="disabled">{{ yesLabel }}</button>
      <button type="button" class="yn-opt" [class.on]="value === false"
              (click)="pick(false)" [disabled]="disabled">{{ noLabel }}</button>
    </div>
  `,
  styles: [`
    .yn {
      display: inline-flex; border: 1.5px solid var(--line-input);
      border-radius: 9px; overflow: hidden; margin-top: 6px;
      &.off { opacity: .55; }
    }
    .yn-opt {
      padding: 9px 22px; font-weight: 700; font-size: 14px;
      font-family: 'Manrope', sans-serif; border: none; cursor: pointer;
      background: var(--surface); color: var(--muted);
      transition: background .14s ease, color .14s ease;
      &.on { background: var(--green); color: #fff; }
      &:not(.on):hover:not(:disabled) { background: var(--surface-alt); color: var(--ink); }
      &:disabled { cursor: default; }
    }
  `]
})
export class YesNoComponent implements ControlValueAccessor {
  @Input() yesLabel = 'Yes';
  @Input() noLabel = 'No';
  @Input() disabled = false;

  value: boolean | null = null;

  private onChange: (v: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  pick(v: boolean) {
    if (this.disabled) return;
    this.value = v;
    this.onChange(v);
    this.onTouched();
  }

  writeValue(v: boolean | null): void { this.value = v ?? false; }
  registerOnChange(fn: (v: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
