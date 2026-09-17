import { ApplicationRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KjSheet, KjSheetComponent, KjSheetRef, KjSheetService, KjSheetTitleComponent } from './sheet';

/**
 * A sheet body the way an app writes one: the core `<kj-sheet>` panel with a
 * styled `<kj-sheet-title>` inside the `<kj-sheet-shell>` so `sheet.css`
 * applies.
 */
@Component({
  selector: 'kj-styled-sheet-body',
  standalone: true,
  imports: [KjSheet, KjSheetComponent, KjSheetTitleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-sheet-shell>
      <kj-sheet>
        <kj-sheet-title>Share</kj-sheet-title>
        <p class="kj-sheet__description">Pick a destination.</p>
        <button id="ok" (click)="ref.close('ok')">OK</button>
      </kj-sheet>
    </kj-sheet-shell>
  `,
})
class StyledSheetBody {
  readonly ref = inject<KjSheetRef<StyledSheetBody, string>>(KjSheetRef);
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 40));

async function flush(): Promise<void> {
  await settle();
  TestBed.inject(ApplicationRef).tick();
  await settle();
}

function findPanel(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('.kj-overlay-container kj-sheet');
}

describe('KjSheetTitleComponent with KjSheetService', () => {
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

  it('renders an <h2 kjSheetTitle> that names the sheet', async () => {
    const ref = TestBed.inject(KjSheetService).open<StyledSheetBody, string>(StyledSheetBody);
    TestBed.inject(ApplicationRef).tick();
    await flush();
    const panel = findPanel()!;
    const heading = panel.querySelector('kj-sheet-title > h2.kj-sheet__title') as HTMLElement;
    expect(heading).not.toBeNull();
    expect(heading.id).toBeTruthy();
    expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(panel).toHaveAccessibleName('Share');
    ref.close();
    await flush();
  });
});
