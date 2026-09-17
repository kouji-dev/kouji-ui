import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KJ_BUTTON_CONFIG, KJ_BUTTON_DEFAULTS, provideKjButton } from '../button/config';
import {
  KJ_BREADCRUMB_CONFIG,
  KJ_BREADCRUMB_DEFAULTS,
  provideKjBreadcrumb,
} from '../breadcrumb/config';
import {
  KJ_PAGINATION_CONFIG,
  KJ_PAGINATION_DEFAULTS,
  provideKjPagination,
} from '../pagination/config';
import { KJ_SPINNER_CONFIG, KJ_SPINNER_DEFAULTS, provideKjSpinner } from '../spinner/config';
import { KJ_ALERT_CONFIG, KJ_ALERT_DEFAULTS, provideKjAlert } from '../alert/config';
import { KJ_TAG_CONFIG, KJ_TAG_DEFAULTS, provideKjTag } from '../tag/config';
import { KJ_BADGE_CONFIG, KJ_BADGE_DEFAULTS, provideKjBadge } from '../badge/config';
import { KJ_LINK_CONFIG, KJ_LINK_DEFAULTS, provideKjLink } from '../link/config';
import {
  KJ_PROGRESS_BAR_CONFIG,
  KJ_PROGRESS_BAR_DEFAULTS,
  provideKjProgressBar,
} from '../progress-bar/config';
import { KJ_TABS_CONFIG, KJ_TABS_DEFAULTS, provideKjTabs } from '../tabs/config';
import {
  KJ_TEXTAREA_CONFIG,
  KJ_TEXTAREA_DEFAULTS,
  provideKjTextarea,
} from '../textarea/config';
import {
  KJ_CHAT_BUBBLE_CONFIG,
  KJ_CHAT_BUBBLE_DEFAULTS,
  provideKjChatBubble,
} from '../chat/config';
import { mergeKjConfig } from './merge-config';

describe('mergeKjConfig', () => {
  it('recurses into plain sub-objects instead of replacing them', () => {
    const merged = mergeKjConfig(
      { defaults: { variant: 'default', size: 'md' }, variants: ['a'] },
      { defaults: { size: 'lg' } },
    );
    expect(merged).toEqual({ defaults: { variant: 'default', size: 'lg' }, variants: ['a'] });
  });

  it('replaces arrays wholesale rather than merging element-wise', () => {
    const merged = mergeKjConfig({ variants: ['a', 'b', 'c'] }, { variants: ['x'] });
    expect(merged.variants).toEqual(['x']);
  });

  it('replaces functions wholesale', () => {
    const fallback = () => 'from defaults';
    const override = () => 'from config';
    const merged = mergeKjConfig({ label: fallback }, { label: override });
    expect(merged.label()).toBe('from config');
  });

  it('treats an explicit undefined as "not provided"', () => {
    const merged = mergeKjConfig(
      { defaults: { size: 'md' } },
      { defaults: { size: undefined } },
    );
    expect(merged.defaults.size).toBe('md');
  });

  it('does not mutate the defaults object', () => {
    const defaults = { defaults: { size: 'md' }, variants: ['a'] };
    mergeKjConfig(defaults, { defaults: { size: 'lg' } });
    expect(defaults.defaults.size).toBe('md');
  });
});

describe('provideKj* merge depth (one rule for every component)', () => {
  // Before this, `Partial<Config>` made `defaults` optional but kept *its*
  // members required, so naming one default was a type error and the caller
  // had to restate the rest — and breadcrumb deep-merged while pagination,
  // button, spinner, alert and tag shallow-merged.
  const cases = [
    {
      name: 'button',
      provide: () => provideKjButton({ defaults: { size: 'lg' } }),
      token: KJ_BUTTON_CONFIG,
      defaults: KJ_BUTTON_DEFAULTS,
    },
    {
      name: 'spinner',
      provide: () => provideKjSpinner({ defaults: { size: 'lg' } }),
      token: KJ_SPINNER_CONFIG,
      defaults: KJ_SPINNER_DEFAULTS,
    },
    {
      name: 'alert',
      provide: () => provideKjAlert({ defaults: { size: 'lg' } }),
      token: KJ_ALERT_CONFIG,
      defaults: KJ_ALERT_DEFAULTS,
    },
    {
      name: 'tag',
      provide: () => provideKjTag({ defaults: { size: 'lg' } }),
      token: KJ_TAG_CONFIG,
      defaults: KJ_TAG_DEFAULTS,
    },
    {
      name: 'badge',
      provide: () => provideKjBadge({ defaults: { size: 'lg' } }),
      token: KJ_BADGE_CONFIG,
      defaults: KJ_BADGE_DEFAULTS,
    },
    {
      name: 'pagination',
      provide: () => provideKjPagination({ defaults: { size: 'lg' } }),
      token: KJ_PAGINATION_CONFIG,
      defaults: KJ_PAGINATION_DEFAULTS,
    },
    {
      name: 'breadcrumb',
      provide: () => provideKjBreadcrumb({ defaults: { size: 'lg' } }),
      token: KJ_BREADCRUMB_CONFIG,
      defaults: KJ_BREADCRUMB_DEFAULTS,
    },
    {
      name: 'link',
      provide: () => provideKjLink({ defaults: { size: 'lg' } }),
      token: KJ_LINK_CONFIG,
      defaults: KJ_LINK_DEFAULTS,
    },
    {
      name: 'progress-bar',
      provide: () => provideKjProgressBar({ defaults: { size: 'lg' } }),
      token: KJ_PROGRESS_BAR_CONFIG,
      defaults: KJ_PROGRESS_BAR_DEFAULTS,
    },
    {
      name: 'textarea',
      provide: () => provideKjTextarea({ defaults: { size: 'lg' } }),
      token: KJ_TEXTAREA_CONFIG,
      defaults: KJ_TEXTAREA_DEFAULTS,
    },
    {
      name: 'chat-bubble',
      provide: () => provideKjChatBubble({ defaults: { size: 'lg' } }),
      token: KJ_CHAT_BUBBLE_CONFIG,
      defaults: KJ_CHAT_BUBBLE_DEFAULTS,
    },
  ];

  for (const c of cases) {
    it(`${c.name}: overriding one default keeps every sibling default`, () => {
      TestBed.configureTestingModule({ providers: [...c.provide()] });
      const config = TestBed.inject(c.token) as { defaults: Record<string, unknown> };
      expect(config.defaults['size']).toBe('lg');
      for (const [key, value] of Object.entries(c.defaults.defaults)) {
        if (key === 'size') continue;
        expect(config.defaults[key]).toEqual(value);
      }
    });

    it(`${c.name}: top-level fields survive a nested override`, () => {
      TestBed.configureTestingModule({ providers: [...c.provide()] });
      const config = TestBed.inject(c.token) as { variants: string[]; sizes: string[] };
      expect(config.variants).toEqual(c.defaults.variants);
      expect(config.sizes).toEqual(c.defaults.sizes);
    });
  }

  // Tabs is the one preset-aware config with no size axis, so it cannot join
  // the table above — its single default is the thing being overridden.
  it('tabs: a nested override keeps the top-level variant list', () => {
    TestBed.configureTestingModule({
      providers: [...provideKjTabs({ defaults: { variant: 'pills' } })],
    });
    const config = TestBed.inject(KJ_TABS_CONFIG);
    expect(config.defaults.variant).toBe('pills');
    expect(config.variants).toEqual(KJ_TABS_DEFAULTS.variants);
  });

  it('an array override still replaces (spread the defaults to extend)', () => {
    TestBed.configureTestingModule({
      providers: [...provideKjButton({ variants: ['only'] })],
    });
    expect(TestBed.inject(KJ_BUTTON_CONFIG).variants).toEqual(['only']);
  });

  it('extending an array is the documented spread', () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideKjButton({ variants: [...KJ_BUTTON_DEFAULTS.variants, 'brand'] }),
      ],
    });
    expect(TestBed.inject(KJ_BUTTON_CONFIG).variants).toContain('brand');
    expect(TestBed.inject(KJ_BUTTON_CONFIG).variants).toContain('ghost');
  });
});
