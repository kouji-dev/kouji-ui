import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { KjLocale, provideKjLocale } from '@kouji-ui/core';
import { KjDirectionToggle } from './direction-toggle';

function setup(providers: unknown[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [KjDirectionToggle],
    providers: [{ provide: LOCALE_ID, useValue: 'en-US' }, ...(providers as [])],
  });
  const fixture = TestBed.createComponent(KjDirectionToggle);
  fixture.detectChanges();
  const button = fixture.nativeElement.querySelector(
    'button.kj-direction-toggle',
  ) as HTMLButtonElement;
  const locale = TestBed.inject(KjLocale);
  return { fixture, button, locale };
}

describe('KjDirectionToggle', () => {
  beforeEach(() => TestBed.resetTestingModule());

  test('renders a native button with an accessible name', () => {
    const { button } = setup();
    expect(button).not.toBeNull();
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('aria-label')).toBe('Toggle right-to-left layout');
  });

  test('aria-pressed reflects the resolved direction (ltr → false)', () => {
    const { button } = setup([provideKjLocale({ direction: 'ltr' })]);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('data-direction')).toBe('ltr');
    expect(button.textContent?.trim()).toBe('LTR');
  });

  test('aria-pressed is true for an RTL locale', () => {
    const { button } = setup([provideKjLocale({ locale: 'ar-EG' })]);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('data-direction')).toBe('rtl');
    expect(button.textContent?.trim()).toBe('RTL');
  });

  test('clicking toggles KjLocale.direction ltr ⇄ rtl', () => {
    const { fixture, button, locale } = setup([
      provideKjLocale({ direction: 'ltr' }),
    ]);
    expect(locale.isRtl()).toBe(false);

    button.click();
    fixture.detectChanges();
    expect(locale.direction()).toBe('rtl');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    button.click();
    fixture.detectChanges();
    expect(locale.direction()).toBe('ltr');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  test('kjAriaLabel overrides the default accessible name', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [KjDirectionToggle],
      providers: [{ provide: LOCALE_ID, useValue: 'en-US' }],
    });
    const fixture = TestBed.createComponent(KjDirectionToggle);
    fixture.componentRef.setInput('kjAriaLabel', 'Flip layout');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Flip layout');
  });
});
