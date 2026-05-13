import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjColorPickerComponent } from './color-picker';

/**
 * Color-picker integrated with a reactive form, including a custom
 * required-hex validator. Demonstrates the `formControl` binding and
 * the touched-gated `kjInvalid` posture.
 */
@Component({
  selector: 'kj-color-picker-in-form-example',
  standalone: true,
  imports: [KjColorPickerComponent, ReactiveFormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md);
            padding: var(--kj-space-xl); background: var(--kj-bg-surface);
            min-height: 320px; }
    label { display: flex; align-items: center; gap: var(--kj-space-md);
            color: var(--kj-fg-default); font: 0.875rem var(--kj-font-sans); }
    .error { color: var(--kj-fg-danger, #ef4444); font: 0.75rem var(--kj-font-sans); }
    code { font: 0.8125rem/1 var(--kj-font-mono, monospace); color: var(--kj-fg-muted); }
  `],
  template: `
    <label for="color-picker-brand">
      Brand color
      <kj-color-picker
        id="color-picker-brand"
        [formControl]="ctrl"
        [kjInvalid]="ctrl.invalid && ctrl.touched"
      />
      <code>{{ ctrl.value }}</code>
    </label>
    @if (ctrl.invalid && ctrl.touched) {
      <span class="error">A valid hex color is required.</span>
    }
  `,
})
export class KjColorPickerInFormExample {
  readonly ctrl = new FormControl('#3b82f6', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^#?[0-9a-fA-F]{3,8}$/)],
  });
}
