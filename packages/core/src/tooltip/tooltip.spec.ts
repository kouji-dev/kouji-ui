import { Component } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjTooltipTrigger } from './tooltip-trigger';
import { KjTooltipContent } from './tooltip-content';

describe('KjTooltip', () => {
  it('trigger has aria-expanded false initially', async () => {
    @Component({
      selector: 'kj-tt-host',
      standalone: true,
      imports: [KjTooltipTrigger, KjTooltipContent],
      template: `
        <button kjTooltipTrigger #t="kjTooltipTrigger">Hover</button>
        <kj-tooltip-content [kjFor]="t">Hi</kj-tooltip-content>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const btn = container.querySelector('button')!;
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('panel is hidden + has role=tooltip', async () => {
    @Component({
      selector: 'kj-tt-host',
      standalone: true,
      imports: [KjTooltipTrigger, KjTooltipContent],
      template: `
        <button kjTooltipTrigger #t="kjTooltipTrigger">Hover</button>
        <kj-tooltip-content [kjFor]="t">Hi</kj-tooltip-content>
      `,
    })
    class Host {}
    const { container } = await render(Host);
    const panel = container.querySelector('kj-tooltip-content') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('tooltip');
    expect(panel.hasAttribute('hidden')).toBe(true);
  });
});
