import { Component, signal } from '@angular/core';
import { KjToggleDirective } from '@kouji-ui/core';

@Component({
  standalone: true,
  imports: [KjToggleDirective],
  styles: [`
    :host { display: block; padding: 2rem; background: #0c0c0c; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    button[kjToggle] { background: #111; border: 1px solid #222; color: #888; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding: 0.5rem 1rem; cursor: pointer; transition: all 0.15s; }
    button[kjToggle][aria-pressed="true"] { background: rgba(184,245,0,0.1); border-color: #b8f500; color: #b8f500; }
  `],
  template: `
    <div class="row">
      <button kjToggle [(kjPressed)]="bold" aria-label="Bold"><b>B</b></button>
      <button kjToggle [(kjPressed)]="italic" aria-label="Italic"><i>I</i></button>
      <button kjToggle [(kjPressed)]="underline" aria-label="Underline"><u>U</u></button>
    </div>
  `,
})
export class ToggleDemoComponent {
  bold = signal(false);
  italic = signal(false);
  underline = signal(false);
}
