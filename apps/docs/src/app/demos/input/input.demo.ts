import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { KjInputDirective } from '@kouji-ui/core';

@Component({
  selector: 'kj-demo-input',
  standalone: true,
  imports: [KjInputDirective, ReactiveFormsModule],
  styles: [`
    :host { display: block; padding: 2rem; background: #0c0c0c; }
    .form { display: flex; flex-direction: column; gap: 1rem; max-width: 380px; }
    label { color: #555; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; }
    input[kjInput] { padding: 0.625rem 0.875rem; background: #111; border: 1px solid #222; color: #f0ede6; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; width: 100%; box-sizing: border-box; }
    input[kjInput]:focus { outline: none; border-color: #b8f500; }
    [aria-invalid="true"] { border-color: #ef4444; }
    .err { color: #ef4444; font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; }
  `],
  template: `
    <div class="form">
      <label>Email</label>
      <input kjInput type="email" [formControl]="email" [kjInvalid]="email.invalid && email.touched" placeholder="you@example.com" />
      @if (email.invalid && email.touched) { <span class="err">Invalid email</span> }
      <label>Disabled</label>
      <input kjInput type="text" [kjDisabled]="true" value="Not editable" />
    </div>
  `,
})
export class InputDemoComponent {
  email = new FormControl('', [Validators.email, Validators.required]);
}
