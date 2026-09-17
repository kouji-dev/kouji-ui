import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { afterEach, describe, expect, it } from 'vitest';
import {
  KjColorPicker,
  KjColorPickerAlphaSlider,
  KjColorPickerArea,
  KjColorPickerHueSlider,
  KjColorPickerInput,
  KjColorPickerPanel,
  KjColorPickerTrigger,
} from '../color-picker/index';
import {
  KjCommandInput,
  KjCommandList,
  KjCommandPalette,
  KjCommandPaletteDialog,
} from '../command-palette/index';
import { KjDatePicker, KjDatePickerCalendar, KjDatePickerTrigger } from '../date-picker/index';
import { KjTreeSelect, KjTreeSelectNode, KjTreeSelectToggle } from '../tree-select/index';
import { provideKjLocale } from '../locale/index';
import { EN_CATALOG, FR_CATALOG, provideKjTranslations } from './index';

/**
 * cust F-7, core half.
 *
 * The catalog calls itself "the source of truth for kouji-ui's visible /
 * assistive-text strings", but a handful of core directives put the name in a
 * `host` block as a literal expression — `'[attr.aria-label]': '"Hue"'` — which
 * `scripts/check-aria-label-literals.mjs` could not see and no registered
 * catalog could reach. They all read `KjTranslateService` now.
 *
 * Each case asserts the English default AND the French translation, because
 * only the second one proves the string is reachable at all: the English
 * values were left byte-identical on purpose, so an EN-only test would pass
 * against the old literals too.
 */
function withFrench(): void {
  TestBed.configureTestingModule({
    providers: [provideKjLocale({ locale: 'fr' }), provideKjTranslations({ fr: FR_CATALOG })],
  });
}

/** Panels portal out to the overlay container, so look there too. */
function find(container: Element, selector: string): Element {
  return (container.querySelector(selector) ?? document.body.querySelector(selector))!;
}

afterEach(() => {
  document.querySelectorAll('[data-kj-overlay-container]').forEach((el) => el.remove());
});

describe('colour-picker controls (cust F-7)', () => {
  const IMPORTS = [
    KjColorPicker,
    KjColorPickerTrigger,
    KjColorPickerPanel,
    KjColorPickerArea,
    KjColorPickerHueSlider,
    KjColorPickerAlphaSlider,
    KjColorPickerInput,
  ];
  const TEMPLATE = `
    <div kjColorPicker kjShowAlpha>
      <button kjColorPickerTrigger>open</button>
      <div kjColorPickerPanel>
        <div kjColorPickerArea></div>
        <input kjColorPickerHueSlider />
        <input kjColorPickerAlphaSlider />
        <input kjColorPickerInput />
      </div>
    </div>`;

  it('names area, hue, alpha, hex and the trigger from the English catalog', async () => {
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(find(container, '[kjColorPickerArea]').getAttribute('aria-label')).toBe(
      EN_CATALOG['colorPicker.area'],
    );
    expect(find(container, '[kjColorPickerHueSlider]').getAttribute('aria-label')).toBe(
      EN_CATALOG['colorPicker.hue'],
    );
    expect(find(container, '[kjColorPickerAlphaSlider]').getAttribute('aria-label')).toBe(
      EN_CATALOG['colorPicker.alpha'],
    );
    expect(find(container, '[kjColorPickerInput]').getAttribute('aria-label')).toBe(
      EN_CATALOG['colorPicker.hex'],
    );
    // The trigger's name interpolates the current value through the catalog.
    expect(find(container, '[kjColorPickerTrigger]').getAttribute('aria-label')).toBe(
      'Color picker, current value #000000',
    );
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(find(container, '[kjColorPickerArea]').getAttribute('aria-label')).toBe(
      FR_CATALOG['colorPicker.area'],
    );
    expect(find(container, '[kjColorPickerHueSlider]').getAttribute('aria-label')).toBe(
      FR_CATALOG['colorPicker.hue'],
    );
    expect(find(container, '[kjColorPickerTrigger]').getAttribute('aria-label')).toBe(
      'Sélecteur de couleur, valeur actuelle #000000',
    );
  });
});

describe('command palette (cust F-7)', () => {
  const IMPORTS = [KjCommandPalette, KjCommandPaletteDialog, KjCommandInput, KjCommandList];
  const TEMPLATE = `
    <div kjCommandPalette>
      <kj-command-palette-dialog>
        <input kjCommandInput />
        <div kjCommandList></div>
      </kj-command-palette-dialog>
    </div>`;

  it('names the dialog and the command list from the English catalog', async () => {
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(find(container, 'kj-command-palette-dialog').getAttribute('aria-label')).toBe(
      EN_CATALOG['commandPalette.dialog'],
    );
    expect(find(container, '[kjCommandList]').getAttribute('aria-label')).toBe(
      EN_CATALOG['commandPalette.list'],
    );
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(find(container, 'kj-command-palette-dialog').getAttribute('aria-label')).toBe(
      FR_CATALOG['commandPalette.dialog'],
    );
    expect(find(container, '[kjCommandList]').getAttribute('aria-label')).toBe(
      FR_CATALOG['commandPalette.list'],
    );
  });
});

describe('date-picker calendar dialog (cust F-7)', () => {
  const IMPORTS = [KjDatePicker, KjDatePickerTrigger, KjDatePickerCalendar];
  const TEMPLATE = `
    <div kjDatePicker>
      <input kjDatePickerTrigger #t="kjDatePickerTrigger" />
      <div kjDatePickerCalendar [kjFor]="t"></div>
    </div>`;

  it('names the calendar from the English catalog', async () => {
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(find(container, '[kjDatePickerCalendar]').getAttribute('aria-label')).toBe(
      EN_CATALOG['datePicker.choose'],
    );
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(find(container, '[kjDatePickerCalendar]').getAttribute('aria-label')).toBe(
      FR_CATALOG['datePicker.choose'],
    );
  });
});

describe('tree-select expand / collapse toggle (cust F-7)', () => {
  const IMPORTS = [KjTreeSelect, KjTreeSelectNode, KjTreeSelectToggle];
  const TEMPLATE = `
    <div kjTreeSelect>
      <div kjTreeSelectNode [kjValue]="'fruits'" kjLabel="Fruits" [kjHasChildren]="true">
        <button kjTreeSelectToggle type="button">&#9654;</button>
      </div>
    </div>`;

  it('says "Expand" while collapsed and "Collapse" once expanded', async () => {
    const { container, fixture } = await render(TEMPLATE, { imports: IMPORTS });
    const toggle = container.querySelector('[kjTreeSelectToggle]') as HTMLElement;
    expect(toggle.getAttribute('aria-label')).toBe(EN_CATALOG['treeSelect.expand']);
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-label')).toBe(EN_CATALOG['treeSelect.collapse']);
  });

  it('follows a registered catalog in both states', async () => {
    withFrench();
    const { container, fixture } = await render(TEMPLATE, { imports: IMPORTS });
    const toggle = container.querySelector('[kjTreeSelectToggle]') as HTMLElement;
    expect(toggle.getAttribute('aria-label')).toBe(FR_CATALOG['treeSelect.expand']);
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-label')).toBe(FR_CATALOG['treeSelect.collapse']);
  });
});
