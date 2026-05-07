import { Component, signal } from '@angular/core';
import {
  KjMultiSelectComponent,
  KjMultiSelectOptionComponent,
} from './multi-select';

interface Member {
  id: string;
  name: string;
}

/**
 * Multi Select with object values plus a custom `getLabel` resolver. The
 * trigger renders chips using the label resolver instead of `String(value)`,
 * so each chip shows the readable name even though the underlying value
 * is the entire member record.
 *
 * Selecting the same member twice is prevented by the supplied
 * `compareWith` matching on `id`, which keeps two-way binding safe across
 * re-fetches that produce new object identities.
 */
@Component({
  selector: 'kj-multi-select-with-tags-example',
  standalone: true,
  imports: [KjMultiSelectComponent, KjMultiSelectOptionComponent],
  styles: [
    `:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`,
  ],
  template: `
    <kj-multi-select
      [(value)]="members"
      [compareWith]="byId"
      [getLabel]="memberLabel"
      placeholder="Add members"
      [maxChips]="2"
    >
      @for (m of allMembers; track m.id) {
        <kj-multi-select-option [value]="m">{{ m.name }}</kj-multi-select-option>
      }
    </kj-multi-select>
  `,
})
export class KjMultiSelectWithTagsExample {
  protected readonly allMembers: Member[] = [
    { id: '1', name: 'Ada Lovelace' },
    { id: '2', name: 'Grace Hopper' },
    { id: '3', name: 'Linus Torvalds' },
    { id: '4', name: 'Margaret Hamilton' },
    { id: '5', name: 'Tim Berners-Lee' },
  ];

  protected readonly members = signal<Member[]>([]);

  protected readonly byId = (a: unknown, b: unknown): boolean =>
    (a as Member | undefined)?.id === (b as Member | undefined)?.id;

  protected readonly memberLabel = (value: unknown): string =>
    (value as Member | undefined)?.name ?? '';
}
