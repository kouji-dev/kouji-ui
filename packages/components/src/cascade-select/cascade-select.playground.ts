import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  KjCascadeOptionComponent,
  KjCascadeSelectComponent,
  KjCascadeSubPanelComponent,
} from './cascade-select';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Tunes placeholder text, disabled
 * state, region count (drives panel structure), and whether one of the
 * leaves is marked disabled so the navigation skip can be observed.
 */
const placeholder = signal('Select a country');
const disabled = signal(false);
const regionCount = signal<1 | 2 | 3>(2);
const disableLeaf = signal(false);

const REGIONS: ReadonlyArray<{
  value: string;
  label: string;
  children: ReadonlyArray<{ value: string; label: string }>;
}> = [
  {
    value: 'eu',
    label: 'Europe',
    children: [
      { value: 'fr', label: 'France' },
      { value: 'de', label: 'Germany' },
      { value: 'it', label: 'Italy' },
    ],
  },
  {
    value: 'am',
    label: 'Americas',
    children: [
      { value: 'us', label: 'United States' },
      { value: 'br', label: 'Brazil' },
    ],
  },
  {
    value: 'as',
    label: 'Asia',
    children: [
      { value: 'jp', label: 'Japan' },
      { value: 'in', label: 'India' },
    ],
  },
];

@Component({
  selector: 'kj-cascade-select-playground',
  standalone: true,
  imports: [
    KjCascadeSelectComponent,
    KjCascadeOptionComponent,
    KjCascadeSubPanelComponent,
  ],
  template: `
    <kj-cascade-select
      [(kjValue)]="selected"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
    >
      @for (region of visibleRegions(); track region.value) {
        <kj-cascade-option [kjValue]="region.value" [kjLabel]="region.label">
          <kj-cascade-sub-panel>
            @for (child of region.children; track child.value; let first = $first) {
              <kj-cascade-option
                [kjValue]="child.value"
                [kjLabel]="child.label"
                [kjDisabled]="disableLeaf() && first"
              />
            }
          </kj-cascade-sub-panel>
        </kj-cascade-option>
      }
    </kj-cascade-select>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCascadeSelectPlaygroundDemo {
  protected readonly placeholder = placeholder;
  protected readonly disabled = disabled;
  protected readonly regionCount = regionCount;
  protected readonly disableLeaf = disableLeaf;
  protected readonly selected = signal<string | undefined>(undefined);

  protected visibleRegions(): typeof REGIONS {
    return REGIONS.slice(0, regionCount());
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjCascadeSelectPlaygroundDemo,
  state: {
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    disabled: disabled as unknown as ReturnType<typeof signal>,
    regionCount: regionCount as unknown as ReturnType<typeof signal>,
    disableLeaf: disableLeaf as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'chips', name: 'regionCount', label: 'regions', options: [1, 2, 3] },
    { kind: 'toggle', name: 'disabled', label: 'disabled' },
    { kind: 'toggle', name: 'disableLeaf', label: 'disable first leaf' },
  ],
  snippet: (values) => {
    const s = values as {
      placeholder: string;
      disabled: boolean;
      regionCount: number;
      disableLeaf: boolean;
    };
    const attrs: string[] = [
      `[(kjValue)]="selected"`,
      `placeholder="${s.placeholder}"`,
    ];
    if (s.disabled) attrs.push('[disabled]="true"');
    const regions = REGIONS.slice(0, s.regionCount)
      .map((region) => {
        const children = region.children
          .map((child, i) => {
            const disabledAttr = s.disableLeaf && i === 0 ? ' [kjDisabled]="true"' : '';
            return `      <kj-cascade-option kjValue="${child.value}" kjLabel="${child.label}"${disabledAttr} />`;
          })
          .join('\n');
        return `  <kj-cascade-option kjValue="${region.value}" kjLabel="${region.label}">\n    <kj-cascade-sub-panel>\n${children}\n    </kj-cascade-sub-panel>\n  </kj-cascade-option>`;
      })
      .join('\n');
    return `<kj-cascade-select\n  ${attrs.join('\n  ')}\n>\n${regions}\n</kj-cascade-select>`;
  },
};
