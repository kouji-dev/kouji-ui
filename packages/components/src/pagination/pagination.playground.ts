import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjPaginationComponent,
  KjPaginationItemComponent,
  KjPaginationPreviousComponent,
  KjPaginationNextComponent,
  KjPaginationFirstComponent,
  KjPaginationLastComponent,
  KjPaginationEllipsisComponent,
} from './pagination';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Knobs let the user re-size the
 * dataset, scrub the current page, and tune the ellipsis windowing controls.
 */
const page = signal<number>(3);
const totalPages = signal<number>(10);
const siblingCount = signal<number>(1);
const boundaryCount = signal<number>(1);
const variant = signal<'default' | 'outline' | 'ghost'>('default');
const size = signal<'sm' | 'md' | 'lg'>('md');

@Component({
  selector: 'kj-pagination-playground',
  standalone: true,
  imports: [
    KjPaginationComponent,
    KjPaginationItemComponent,
    KjPaginationPreviousComponent,
    KjPaginationNextComponent,
    KjPaginationFirstComponent,
    KjPaginationLastComponent,
    KjPaginationEllipsisComponent,
  ],
  template: `
    <kj-pagination
      [(kjPage)]="page"
      [kjTotalPages]="totalPages()"
      [kjSiblingCount]="siblingCount()"
      [kjBoundaryCount]="boundaryCount()"
      [kjVariant]="variant()"
      [kjSize]="size()"
      #p="kjPagination"
    >
      <kj-pagination-first>«</kj-pagination-first>
      <kj-pagination-previous>‹</kj-pagination-previous>
      @for (token of p.pages(); track token) {
        @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
          <kj-pagination-ellipsis>…</kj-pagination-ellipsis>
        } @else {
          <kj-pagination-item [kjPage]="token">{{ token }}</kj-pagination-item>
        }
      }
      <kj-pagination-next>›</kj-pagination-next>
      <kj-pagination-last>»</kj-pagination-last>
    </kj-pagination>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationPlaygroundDemo {
  protected readonly page = page;
  protected readonly totalPages = totalPages;
  protected readonly siblingCount = siblingCount;
  protected readonly boundaryCount = boundaryCount;
  protected readonly variant = variant;
  protected readonly size = size;
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjPaginationPlaygroundDemo,
  state: {
    page: page as unknown as ReturnType<typeof signal>,
    totalPages: totalPages as unknown as ReturnType<typeof signal>,
    siblingCount: siblingCount as unknown as ReturnType<typeof signal>,
    boundaryCount: boundaryCount as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    size: size as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'number', name: 'page', label: 'page', min: 1 },
    { kind: 'number', name: 'totalPages', label: 'total pages', min: 1, max: 100 },
    { kind: 'number', name: 'siblingCount', label: 'sibling count', min: 0, max: 5 },
    { kind: 'number', name: 'boundaryCount', label: 'boundary count', min: 0, max: 5 },
    { kind: 'chips', name: 'variant', label: 'variant', options: ['default', 'outline', 'ghost'] },
    { kind: 'chips', name: 'size', label: 'size', options: ['sm', 'md', 'lg'] },
  ],
  snippet: (values) => {
    const s = values as {
      page: number;
      totalPages: number;
      siblingCount: number;
      boundaryCount: number;
      variant: string;
      size: string;
    };
    const attrs: string[] = [
      `[(kjPage)]="page"`,
      `[kjTotalPages]="${s.totalPages}"`,
      `[kjSiblingCount]="${s.siblingCount}"`,
      `[kjBoundaryCount]="${s.boundaryCount}"`,
      `kjVariant="${s.variant}"`,
      `kjSize="${s.size}"`,
    ];
    return `<kj-pagination\n  ${attrs.join('\n  ')}\n  #p="kjPagination"\n>\n  <kj-pagination-first>«</kj-pagination-first>\n  <kj-pagination-previous>‹</kj-pagination-previous>\n  @for (token of p.pages(); track token) {\n    @if (token === 'ellipsis-left' || token === 'ellipsis-right') {\n      <kj-pagination-ellipsis>…</kj-pagination-ellipsis>\n    } @else {\n      <kj-pagination-item [kjPage]="token">{{ token }}</kj-pagination-item>\n    }\n  }\n  <kj-pagination-next>›</kj-pagination-next>\n  <kj-pagination-last>»</kj-pagination-last>\n</kj-pagination>`;
  },
};
