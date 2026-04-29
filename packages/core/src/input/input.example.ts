import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjInputDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjInputDirective, ReactiveFormsModule],
  styles: [`
    .form { padding: 2rem; background: #0c0c0c; display: flex; flex-direction: column; gap: 1rem; max-width: 400px; }
    [kjInput] { padding: 0.625rem 0.875rem; background: #111; border: 1px solid #222; color: #f0ede6; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; width: 100%; }
    [kjInput]:focus { outline: none; border-color: #b8f500; }
    [aria-invalid="true"] { border-color: #ef4444; }
    .error { color: #ef4444; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }
    label { color: #888; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }
  `],
  template: `
    <div class="form">
      <label for="email">Email</label>
      <input id="email" kjInput type="email" [formControl]="emailCtrl"
        [kjInvalid]="emailCtrl.invalid && emailCtrl.touched"
        placeholder="you@example.com" />
      @if (emailCtrl.invalid && emailCtrl.touched) {
        <span class="error">Please enter a valid email.</span>
      }
      <label for="disabled">Disabled input</label>
      <input id="disabled" kjInput type="text" [kjDisabled]="true" value="Not editable" />
    </div>
  `,
})
export class InputExampleComponent {
  emailCtrl = new FormControl('', [Validators.email, Validators.required]);
}
