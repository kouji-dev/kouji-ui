import { Component, signal } from '@angular/core';
import type { KjTreeNode } from '@kouji-ui/core';
import { KjTreeSelectComponent } from './tree-select';

/**
 * A walkthrough of the most common tree-select usages — single-select with a
 * readout, multi-select that reports a count, and a pre-expanded panel on
 * mount. Use this as the copy-paste starting point.
 */
@Component({
  selector: 'kj-tree-select-usage-example',
  standalone: true,
  imports: [KjTreeSelectComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
    p { margin: 0; font: 0.875rem var(--kj-font-sans); color: var(--kj-fg-muted); }
    .row { display: flex; gap: var(--kj-space-md); align-items: center; }
  `],
  template: `
    <div class="row">
      <kj-tree-select [kjNodes]="topics" [(kjValue)]="single" placeholder="Pick a topic" />
      <p>Selected: {{ single() ?? 'none' }}</p>
    </div>

    <div class="row">
      <kj-tree-select
        [kjNodes]="topics"
        kjSelectionMode="multiple"
        [(kjValue)]="multi"
        placeholder="Pick topics"
      />
      <p>{{ multi().length }} selected</p>
    </div>

    <div class="row">
      <kj-tree-select
        [kjNodes]="topics"
        [(kjValue)]="open"
        [(kjExpandedKeys)]="expanded"
        placeholder="Pre-expanded"
      />
    </div>
  `,
})
export class KjTreeSelectUsageExample {
  protected readonly single = signal<string | undefined>(undefined);
  protected readonly multi = signal<string[]>([]);
  protected readonly open = signal<string | undefined>(undefined);
  protected readonly expanded = signal<unknown[]>(['frontend']);

  protected readonly topics: KjTreeNode<string>[] = [
    {
      value: 'frontend',
      label: 'Frontend',
      children: [
        { value: 'html', label: 'HTML' },
        { value: 'css', label: 'CSS' },
        { value: 'javascript', label: 'JavaScript' },
      ],
    },
    {
      value: 'backend',
      label: 'Backend',
      children: [
        { value: 'nodejs', label: 'Node.js' },
        { value: 'python', label: 'Python' },
      ],
    },
  ];
}
