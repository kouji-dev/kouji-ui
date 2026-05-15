import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KjKbdComponent } from './kbd';

/**
 * Common kbd usages — sizes for inline-with-prose, a glyph key with an
 * aria-label override, and a combo shortcut.
 */
@Component({
  selector: 'kj-kbd-usage-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KjKbdComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); max-width: 60ch; }
    p { line-height: 1.6; margin: 0; }
  `],
  template: `
    <p>
      Sizes inline with prose:
      <kj-kbd kjSize="xs">⌘</kj-kbd>
      <kj-kbd kjSize="sm">Shift</kj-kbd>
      <kj-kbd kjSize="md">Enter</kj-kbd>
      <kj-kbd kjSize="lg">Esc</kj-kbd>
    </p>

    <p>
      Glyph keys with aria-labels for AT:
      <kj-kbd kjKbdAriaLabel="Command">⌘</kj-kbd>
      <kj-kbd kjKbdAriaLabel="Option">⌥</kj-kbd>
      <kj-kbd kjKbdAriaLabel="Shift">⇧</kj-kbd>
    </p>

    <p>
      Combo: press <kj-kbd>Ctrl</kj-kbd> + <kj-kbd>K</kj-kbd> to focus search.
    </p>
  `,
})
export class KjKbdUsageExample {}
