import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjBreadcrumbComponent,
  KjBreadcrumbCurrentComponent,
  KjBreadcrumbItemComponent,
  KjBreadcrumbLinkComponent,
  KjBreadcrumbListComponent,
} from './breadcrumb';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs vary the trail depth, the
 * cascaded size, and the overflow cap so the truncation behaviour can be
 * exercised live.
 */
const size = signal<'sm' | 'md' | 'lg'>('md');
const depth = signal<3 | 4 | 5 | 6>(4);
const maxItems = signal<0 | 3 | 4>(0);

const PATH: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/library', label: 'Library' },
  { href: '/library/data', label: 'Data display' },
  { href: '/library/data/breadcrumb', label: 'Breadcrumb' },
  { href: '/library/data/breadcrumb/usage', label: 'Usage' },
  { href: '/library/data/breadcrumb/usage/detail', label: 'Detail' },
];

@Component({
  selector: 'kj-breadcrumb-playground',
  standalone: true,
  imports: [
    KjBreadcrumbComponent,
    KjBreadcrumbListComponent,
    KjBreadcrumbItemComponent,
    KjBreadcrumbLinkComponent,
    KjBreadcrumbCurrentComponent,
  ],
  template: `
    <kj-breadcrumb [kjSize]="size()" [kjMaxItems]="maxItems()">
      <kj-breadcrumb-list>
        @for (crumb of trail(); track crumb.href; let last = $last) {
          <kj-breadcrumb-item>
            @if (last) {
              <kj-breadcrumb-current>{{ crumb.label }}</kj-breadcrumb-current>
            } @else {
              <kj-breadcrumb-link [kjHref]="crumb.href">{{ crumb.label }}</kj-breadcrumb-link>
            }
          </kj-breadcrumb-item>
        }
      </kj-breadcrumb-list>
    </kj-breadcrumb>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBreadcrumbPlaygroundDemo {
  protected readonly size = size;
  protected readonly depth = depth;
  protected readonly maxItems = maxItems;

  protected trail(): typeof PATH {
    return PATH.slice(0, depth());
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjBreadcrumbPlaygroundDemo,
  state: {
    size: size as unknown as ReturnType<typeof signal>,
    depth: depth as unknown as ReturnType<typeof signal>,
    maxItems: maxItems as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
    { kind: 'chips', name: 'depth', label: 'depth', options: [3, 4, 5, 6] },
    { kind: 'chips', name: 'maxItems', label: 'max items', options: [0, 3, 4] },
  ],
  snippet: (values) => {
    const s = values as { size: string; depth: number; maxItems: number };
    const attrs: string[] = [`kjSize="${s.size}"`];
    if (s.maxItems > 0) attrs.push(`[kjMaxItems]="${s.maxItems}"`);
    const crumbs = PATH.slice(0, s.depth)
      .map((c, i, arr) => {
        const last = i === arr.length - 1;
        const inner = last
          ? `<kj-breadcrumb-current>${c.label}</kj-breadcrumb-current>`
          : `<kj-breadcrumb-link kjHref="${c.href}">${c.label}</kj-breadcrumb-link>`;
        return `    <kj-breadcrumb-item>${inner}</kj-breadcrumb-item>`;
      })
      .join('\n');
    return `<kj-breadcrumb\n  ${attrs.join('\n  ')}\n>\n  <kj-breadcrumb-list>\n${crumbs}\n  </kj-breadcrumb-list>\n</kj-breadcrumb>`;
  },
};
