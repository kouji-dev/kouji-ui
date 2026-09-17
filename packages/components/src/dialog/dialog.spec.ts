import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KjDialog, KjDialogComponent, KjDialogRef, KjDialogService, KjDialogTitleComponent } from './dialog';

/**
 * A dialog body the way an app writes one: the core `<kj-dialog>` panel with
 * a styled `<kj-dialog-title>` inside the `<kj-dialog-shell>` so `dialog.css`
 * applies.
 */
@Component({
  selector: 'kj-styled-dialog-body',
  standalone: true,
  imports: [KjDialog, KjDialogComponent, KjDialogTitleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-dialog-shell>
      <kj-dialog>
        <kj-dialog-title>Save changes?</kj-dialog-title>
        <p>Your edits will be applied immediately.</p>
        <button id="ok" (click)="ref.close('ok')">OK</button>
      </kj-dialog>
    </kj-dialog-shell>
  `,
})
class StyledDialogBody {
  readonly ref = inject<KjDialogRef<StyledDialogBody, string>>(KjDialogRef);
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
}

function findPanel(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container kj-dialog');
}

describe('KjDialogTitleComponent with KjDialogService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(async () => {
    document.querySelectorAll('.kj-overlay-container > *').forEach((el) => el.remove());
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
    await settle();
  });

  it('renders an <h2 kjDialogTitle> that names the dialog', async () => {
    const ref = TestBed.inject(KjDialogService).open<StyledDialogBody, string>(StyledDialogBody);
    TestBed.inject(ApplicationRef).tick();
    await flush();
    const panel = findPanel()!;
    const heading = panel.querySelector('kj-dialog-title > h2.kj-dialog-title') as HTMLElement;
    expect(heading).not.toBeNull();
    expect(heading.id).toBeTruthy();
    expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(panel).toHaveAccessibleName('Save changes?');
    ref.close();
    await flush();
  });
});
