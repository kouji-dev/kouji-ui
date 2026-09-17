import { TestBed } from '@angular/core/testing';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import {
  EN_CATALOG,
  FR_CATALOG,
  provideKjLocale,
  provideKjTranslations,
} from '@kouji-ui/core';
import { KjCalendarComponent } from './calendar/calendar';
import {
  KjCarouselComponent,
  KjCarouselIndicatorsComponent,
  KjCarouselNextComponent,
  KjCarouselPause,
  KjCarouselPreviousComponent,
  KjCarouselSlideComponent,
  KjCarouselViewportComponent,
} from './carousel/carousel';
import { KjChatMessage } from './chat/chat-message';
import { KjPromptInput } from './chat/prompt-input';
import { KjColorPickerComponent } from './color-picker/color-picker';
import { KjToastViewportComponent } from './toast/toast';

/**
 * cust F-7, components half.
 *
 * `en.ts` claims to be "the source of truth for kouji-ui's visible /
 * assistive-text strings", but twelve accessible names were baked into
 * `@kouji-ui/components` templates (and one into a `host` block), where no
 * catalog could reach them: a consumer who registered a French catalog still
 * heard "Next month", "Send message", "Notifications".
 *
 * Every one of them now resolves through `KjTranslateService`. These tests pin
 * both halves of that contract — the English default AND the translation —
 * because only the second one proves the string is actually reachable.
 * `scripts/check-aria-label-literals.mjs` (CI: `pnpm check:aria-labels`) is the
 * mechanical half: it fails on any new literal, in a template attribute, a
 * literal `[attr.aria-label]` binding, a `host` block, or an `aria-label` input
 * DEFAULT.
 */
function withFrench(): void {
  TestBed.configureTestingModule({
    providers: [provideKjLocale({ locale: 'fr' }), provideKjTranslations({ fr: FR_CATALOG })],
  });
}

function labelsOf(container: Element, selector: string): (string | null)[] {
  return [...container.querySelectorAll(selector)].map((el) => el.getAttribute('aria-label'));
}

describe('calendar month arrows (cust F-7)', () => {
  const TEMPLATE = `<kj-calendar />`;

  it('names both arrows from the English catalog by default', async () => {
    const { container } = await render(TEMPLATE, { imports: [KjCalendarComponent] });
    expect(labelsOf(container, '.kj-calendar__nav')).toEqual([
      EN_CATALOG['calendar.previousMonth'],
      EN_CATALOG['calendar.nextMonth'],
    ]);
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(TEMPLATE, { imports: [KjCalendarComponent] });
    expect(labelsOf(container, '.kj-calendar__nav')).toEqual([
      FR_CATALOG['calendar.previousMonth'],
      FR_CATALOG['calendar.nextMonth'],
    ]);
  });
});

describe('colour picker trigger and preset listbox (cust F-7)', () => {
  const TEMPLATE = `<kj-color-picker [kjPresets]="presets" />`;
  const componentProperties = { presets: [{ value: '#ff0000', label: 'Red' }] };

  /**
   * The wrapper used to carry a static `aria-label="Open color picker"` on the
   * trigger. It never reached the page: `KjColorPickerTrigger` host-binds
   * `[attr.aria-label]`, which overwrites the attribute. The dead markup is
   * gone and the real name — the core directive's, which interpolates the
   * current value — is what the catalog now owns.
   */
  it('names the trigger and the preset listbox from the English catalog', async () => {
    const { container } = await render(TEMPLATE, {
      imports: [KjColorPickerComponent],
      componentProperties,
    });
    expect(
      container.querySelector('.kj-color-picker-trigger')!.getAttribute('aria-label'),
    ).toBe('Color picker, current value #000000');
    expect(
      container.querySelector('.kj-color-picker-presets')!.getAttribute('aria-label'),
    ).toBe(EN_CATALOG['colorPicker.presets']);
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(TEMPLATE, {
      imports: [KjColorPickerComponent],
      componentProperties,
    });
    expect(
      container.querySelector('.kj-color-picker-trigger')!.getAttribute('aria-label'),
    ).toBe('Sélecteur de couleur, valeur actuelle #000000');
    expect(
      container.querySelector('.kj-color-picker-presets')!.getAttribute('aria-label'),
    ).toBe(FR_CATALOG['colorPicker.presets']);
  });

  it('names the area, hue and hex controls from the catalog too', async () => {
    withFrench();
    const { container } = await render(`<kj-color-picker kjShowAlpha />`, {
      imports: [KjColorPickerComponent],
    });
    expect(container.querySelector('.kj-color-picker-area')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['colorPicker.area'],
    );
    expect(
      container.querySelector('.kj-color-picker-hue-slider')!.getAttribute('aria-label'),
    ).toBe(FR_CATALOG['colorPicker.hue']);
    expect(
      container.querySelector('.kj-color-picker-alpha-slider')!.getAttribute('aria-label'),
    ).toBe(FR_CATALOG['colorPicker.alpha']);
    expect(container.querySelector('.kj-color-picker-input')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['colorPicker.hex'],
    );
  });
});

describe('prompt input send / stop buttons (cust F-7)', () => {
  it('names the send button from the English catalog', async () => {
    const { container } = await render(`<kj-prompt-input />`, { imports: [KjPromptInput] });
    expect(container.querySelector('.kj-prompt__btn--send')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['chat.send'],
    );
  });

  it('names the stop button from a registered catalog while streaming', async () => {
    withFrench();
    const { container } = await render(`<kj-prompt-input [kjStreaming]="true" />`, {
      imports: [KjPromptInput],
    });
    expect(container.querySelector('.kj-prompt__btn--stop')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['chat.stop'],
    );
  });
});

describe('chat message typing indicator and citation list (cust F-7)', () => {
  const STREAMING = {
    message: { id: 'm1', role: 'assistant' as const, content: '', streaming: true },
  };
  const CITED = {
    message: {
      id: 'm2',
      role: 'assistant' as const,
      content: 'hi',
      citations: [{ id: 'c1', title: 'Spec', url: 'https://example.test' }],
    },
  };

  it('names the typing indicator from the English catalog', async () => {
    const { container } = await render(`<kj-chat-message [message]="message" />`, {
      imports: [KjChatMessage],
      componentProperties: STREAMING,
    });
    expect(container.querySelector('.kj-chat-typing')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['chat.typing'],
    );
  });

  it('names the citation list from the English catalog', async () => {
    const { container } = await render(`<kj-chat-message [message]="message" />`, {
      imports: [KjChatMessage],
      componentProperties: CITED,
    });
    expect(container.querySelector('.kj-chat-cites')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['chat.sources'],
    );
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(`<kj-chat-message [message]="message" />`, {
      imports: [KjChatMessage],
      componentProperties: STREAMING,
    });
    expect(container.querySelector('.kj-chat-typing')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['chat.typing'],
    );
  });
});

describe('toast viewport landmark (cust F-7)', () => {
  it('names the region from the English catalog', async () => {
    const { container } = await render(`<kj-toast-viewport />`, {
      imports: [KjToastViewportComponent],
    });
    expect(container.querySelector('.kj-toast-viewport')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['toast.region'],
    );
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(`<kj-toast-viewport />`, {
      imports: [KjToastViewportComponent],
    });
    expect(container.querySelector('.kj-toast-viewport')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['toast.region'],
    );
  });
});

/**
 * The carousel controls are the subtle case the gate's fourth pattern exists
 * for: the name was an INPUT DEFAULT (`input<string>('Next slide', { alias:
 * 'aria-label' })`), overridable but untranslatable. The input now defaults to
 * `undefined` and falls through to the catalog, so both the default and the
 * override still have to work.
 */
describe('carousel controls (cust F-7)', () => {
  const IMPORTS = [
    KjCarouselComponent,
    KjCarouselViewportComponent,
    KjCarouselSlideComponent,
    KjCarouselPreviousComponent,
    KjCarouselNextComponent,
    KjCarouselIndicatorsComponent,
    KjCarouselPause,
  ];
  const TEMPLATE = `
    <kj-carousel value="a" label="Deck">
      <kj-carousel-previous />
      <kj-carousel-viewport>
        <kj-carousel-slide value="a">one</kj-carousel-slide>
        <kj-carousel-slide value="b">two</kj-carousel-slide>
      </kj-carousel-viewport>
      <kj-carousel-next />
      <kj-carousel-pause />
      <kj-carousel-indicators />
    </kj-carousel>`;

  it('names every control, and each indicator, from the English catalog', async () => {
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(container.querySelector('.kj-carousel-previous')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['carousel.previous'],
    );
    expect(container.querySelector('.kj-carousel-next')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['carousel.next'],
    );
    expect(container.querySelector('.kj-carousel-pause')!.getAttribute('aria-label')).toBe(
      EN_CATALOG['carousel.pause'],
    );
    expect(labelsOf(container, '.kj-carousel-indicator')).toEqual(['Slide 1', 'Slide 2']);
  });

  it('follows a registered catalog', async () => {
    withFrench();
    const { container } = await render(TEMPLATE, { imports: IMPORTS });
    expect(container.querySelector('.kj-carousel-previous')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['carousel.previous'],
    );
    expect(container.querySelector('.kj-carousel-next')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['carousel.next'],
    );
    expect(labelsOf(container, '.kj-carousel-indicator')).toEqual([
      'Diapositive 1',
      'Diapositive 2',
    ]);
  });

  it('an explicit aria-label on one control still wins over the catalog', async () => {
    withFrench();
    const { container } = await render(
      `<kj-carousel value="a" label="Deck">
         <kj-carousel-previous aria-label="Reculer" />
         <kj-carousel-next />
       </kj-carousel>`,
      { imports: IMPORTS },
    );
    expect(container.querySelector('.kj-carousel-previous')!.getAttribute('aria-label')).toBe(
      'Reculer',
    );
    expect(container.querySelector('.kj-carousel-next')!.getAttribute('aria-label')).toBe(
      FR_CATALOG['carousel.next'],
    );
  });
});
