import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  KjAlertComponent,
  KjAlertDescriptionComponent,
  KjAlertIconComponent,
  KjAlertTitleComponent,
} from '../alert';

/**
 * Side-by-side rendering of every default severity. Each variant flips the
 * accent border + title colour via `--kj-alert-accent`. The `error` variant
 * additionally resolves to `role="alert"` + `aria-live="assertive"`.
 */
@Component({
  selector: 'kj-alert-variants-example',
  standalone: true,
  imports: [
    KjAlertComponent,
    KjAlertIconComponent,
    KjAlertTitleComponent,
    KjAlertDescriptionComponent,
  ],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-alert kjVariant="info">
      <kj-alert-icon>i</kj-alert-icon>
      <kj-alert-title>Info</kj-alert-title>
      <kj-alert-description>Polite info note — non-interrupting announcement.</kj-alert-description>
    </kj-alert>

    <kj-alert kjVariant="success">
      <kj-alert-icon>✓</kj-alert-icon>
      <kj-alert-title>Saved</kj-alert-title>
      <kj-alert-description>Your changes have been saved successfully.</kj-alert-description>
    </kj-alert>

    <kj-alert kjVariant="warning">
      <kj-alert-icon>!</kj-alert-icon>
      <kj-alert-title>Heads up</kj-alert-title>
      <kj-alert-description>Your storage is over 80% full.</kj-alert-description>
    </kj-alert>

    <kj-alert kjVariant="error">
      <kj-alert-icon>✕</kj-alert-icon>
      <kj-alert-title>Could not save</kj-alert-title>
      <kj-alert-description
        >Network request timed out. Resolves to assertive automatically.</kj-alert-description
      >
    </kj-alert>

    <kj-alert kjVariant="neutral">
      <kj-alert-title>Note</kj-alert-title>
      <kj-alert-description>Neutral message with no severity colour.</kj-alert-description>
    </kj-alert>
  `,
})
export class KjAlertVariantsExample {}
