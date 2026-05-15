import { Component, signal } from '@angular/core';
import { kjFuzzyFilter } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjCommandPaletteComponent,
  KjCommandItemComponent,
} from './command-palette';

/**
 * Modal command palette with a custom fuzzy filter — type abbreviations
 * to match commands. For example, type `gth` to match "git checkout",
 * or `tth` for "Toggle Theme".
 */
@Component({
  selector: 'kj-command-palette-fuzzy-example',
  standalone: true,
  imports: [KjCommandPaletteComponent, KjCommandItemComponent, KjButtonComponent],
  styles: [`:host { display: flex; flex-direction: column; gap: var(--kj-space-md); align-items: flex-start; min-height: 18rem; }
  .hint { margin: 0; font-family: var(--kj-font-mono); font-size: 0.75rem; color: var(--kj-fg-muted); }`],
  template: `
    <kj-button kjVariant="outline" (click)="open.set(true)">Open fuzzy palette</kj-button>
    <p class="hint">Try typing: <code>gth</code>, <code>tth</code>, <code>ofil</code></p>

    <kj-command-palette
      [(kjOpen)]="open"
      [kjFilter]="fuzzyFilter"
      kjPlaceholder="Fuzzy search (try gth)…"
    >
      <kj-command-item kjValue="git-checkout">git checkout</kj-command-item>
      <kj-command-item kjValue="toggle-theme">Toggle Theme</kj-command-item>
      <kj-command-item kjValue="open-file">Open File</kj-command-item>
      <kj-command-item kjValue="new-window">New Window</kj-command-item>
      <kj-command-item kjValue="find-replace">Find and Replace</kj-command-item>
      <kj-command-item kjValue="format-doc">Format Document</kj-command-item>
    </kj-command-palette>
  `,
})
export class KjCommandPaletteFuzzyExample {
  readonly open = signal(false);
  readonly fuzzyFilter = kjFuzzyFilter;
}
