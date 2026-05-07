import { Component, signal } from '@angular/core';
import {
  KjPopoverComponent,
  KjPopoverTriggerComponent,
  KjPopoverContentComponent,
  KjPopoverTitleComponent,
  KjPopoverCloseComponent,
} from './popover';
import { KjButtonComponent } from '../button/button';
import { KjInputComponent } from '../input/input';

/**
 * Popover with an inline form. Demonstrates focus management — auto-focus
 * lands on the first focusable child (the project name input), Tab cycles
 * through the form's controls, Shift+Tab leaves the panel from the first
 * field (because this example is non-modal). Submitting closes the popover
 * via the two-way `[(kjOpen)]` model.
 */
@Component({
  selector: 'kj-popover-with-form-example',
  standalone: true,
  imports: [
    KjPopoverComponent,
    KjPopoverTriggerComponent,
    KjPopoverContentComponent,
    KjPopoverTitleComponent,
    KjPopoverCloseComponent,
    KjButtonComponent,
    KjInputComponent,
  ],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); padding: var(--kj-space-2xl); background: var(--kj-color-base-200); min-height: 16rem; }
    .kj-popover-with-form-example__form { display: flex; flex-direction: column; gap: var(--kj-space-sm); }
    .kj-popover-with-form-example__field { display: flex; flex-direction: column; gap: var(--kj-space-2xs); }
    .kj-popover-with-form-example__label { font-size: 0.8125rem; font-weight: 500; }
    .kj-popover-with-form-example__footer { display: flex; justify-content: flex-end; gap: var(--kj-space-sm); margin-top: var(--kj-space-sm); }
    .kj-popover-with-form-example__status { font-size: 0.8125rem; color: var(--kj-color-base-content); opacity: 0.75; }
  `],
  template: `
    <span class="kj-popover-with-form-example__status">
      Last saved name: {{ savedName() || '—' }}
    </span>

    <kj-popover [(kjOpen)]="open">
      <kj-popover-trigger>
        <kj-button kjVariant="default">New project</kj-button>
      </kj-popover-trigger>
      <kj-popover-content kjAriaLabel="New project">
        <kj-popover-title>New project</kj-popover-title>
        <form
          class="kj-popover-with-form-example__form"
          (submit)="$event.preventDefault(); save()"
        >
          <label for="popover-project-name" class="kj-popover-with-form-example__field">
            <span class="kj-popover-with-form-example__label">Project name</span>
            <kj-input
              id="popover-project-name"
              type="text"
              placeholder="My project"
              [value]="draft()"
              (input)="draft.set($any($event.target).value)"
            />
          </label>
          <div class="kj-popover-with-form-example__footer">
            <kj-popover-close>
              <kj-button kjVariant="ghost">Cancel</kj-button>
            </kj-popover-close>
            <kj-button kjType="submit" kjVariant="default">Create</kj-button>
          </div>
        </form>
      </kj-popover-content>
    </kj-popover>
  `,
})
export class KjPopoverWithFormExample {
  readonly open = signal(false);
  readonly draft = signal('');
  readonly savedName = signal('');

  save(): void {
    const v = this.draft().trim();
    if (!v) return;
    this.savedName.set(v);
    this.draft.set('');
    this.open.set(false);
  }
}
