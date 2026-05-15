import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KjCalendarComponent } from './calendar';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes the locale, first day of
 * week, disabled state, and a "weekends disabled" predicate so the grid
 * geometry and accessibility paths can be probed.
 */
const locale = signal<'en-US' | 'fr-FR' | 'ja-JP' | 'de-DE'>('en-US');
const firstDayOfWeek = signal<0 | 1 | 6>(0);
const disableWeekends = signal(false);
const disabled = signal(false);
const selected = signal<Date | null>(new Date());

@Component({
  selector: 'kj-calendar-playground',
  standalone: true,
  imports: [KjCalendarComponent],
  template: `
    <kj-calendar
      [(kjValue)]="selected"
      [kjLocale]="locale()"
      [kjFirstDayOfWeek]="firstDayOfWeek()"
      [kjDisabledDates]="disableWeekends() ? weekendPredicate : null"
      [kjDisabled]="disabled()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCalendarPlaygroundDemo {
  protected readonly locale = locale;
  protected readonly firstDayOfWeek = firstDayOfWeek;
  protected readonly disableWeekends = disableWeekends;
  protected readonly disabled = disabled;
  protected readonly selected = selected;

  protected readonly weekendPredicate = (d: Date): boolean => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjCalendarPlaygroundDemo,
  state: {
    locale: locale as unknown as ReturnType<typeof signal>,
    firstDayOfWeek: firstDayOfWeek as unknown as ReturnType<typeof signal>,
    disableWeekends: disableWeekends as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
  },
  controls: [
    {
      kind: 'chips',
      name: 'locale',
      label: 'locale',
      options: ['en-US', 'fr-FR', 'ja-JP', 'de-DE'],
    },
    {
      kind: 'chips',
      name: 'firstDayOfWeek',
      label: 'first day',
      options: [0, 1, 6],
    },
    { kind: 'toggle', name: 'disableWeekends', label: 'disable weekends' },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
  ],
  snippet: (values) => {
    const s = values as {
      locale: string;
      firstDayOfWeek: number;
      disableWeekends: boolean;
      disabled: boolean;
    };
    const attrs: string[] = [
      `[(kjValue)]="selected"`,
      `kjLocale="${s.locale}"`,
      `[kjFirstDayOfWeek]="${s.firstDayOfWeek}"`,
    ];
    if (s.disableWeekends) attrs.push('[kjDisabledDates]="weekendPredicate"');
    if (s.disabled) attrs.push('[kjDisabled]="true"');
    return `<kj-calendar\n  ${attrs.join('\n  ')}\n/>`;
  },
};
