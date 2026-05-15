import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjTextareaComponent } from './textarea';

/**
 * A walkthrough of the most common textarea usages — placeholder + `[(ngModel)]`,
 * character counter with live region, and an invalid state. Use this as the
 * copy-paste starting point for new screens.
 */
@Component({
  selector: 'kj-textarea-usage-example',
  standalone: true,
  imports: [KjTextareaComponent, FormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .hint { font: 0.75rem var(--kj-font-sans); color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-textarea
      [kjRows]="4"
      kjPlaceholder="Share a quick update…"
      [(ngModel)]="bio"
    ></kj-textarea>

    <kj-textarea
      [kjRows]="3"
      [kjMaxLength]="120"
      kjShowCounter
      kjPlaceholder="Up to 120 characters"
      [(ngModel)]="summary"
    ></kj-textarea>

    <kj-textarea
      [kjRows]="2"
      [kjInvalid]="true"
      kjPlaceholder="At least 10 characters"
    ></kj-textarea>
    <p class="hint">Must be at least 10 characters long.</p>
  `,
})
export class KjTextareaUsageExample {
  readonly bio = signal('');
  readonly summary = signal('');
}
