import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { A11yPanel } from './panels/a11y-panel';

/** Single scrollable column: former Accessibility tab content plus Shape/Motion and Type. */
@Component({
  selector: 'kj-theme-config-panel',
  standalone: true,
  imports: [A11yPanel],
  templateUrl: './theme-config-panel.html',
  styleUrl: './theme-config-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeConfigPanel {
  private readonly document = inject(DOCUMENT);

  /**
   * Scrolls the contrast report into view (toolbar a11y chip).
   * Tab ids are kept for API compatibility with `ThemeGeneratorComponent`.
   */
  activate(_tab: 'shape-motion' | 'type' | 'a11y'): void {
    this.document.getElementById('tg-contrast-focus')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }
}
