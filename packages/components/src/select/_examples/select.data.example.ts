import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjSelectComponent } from '../select';

interface User {
  readonly id: number;
  readonly name: string;
  readonly team: string;
}

@Component({
  selector: 'kj-select-data-example',
  standalone: true,
  imports: [KjSelectComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-select
      [(value)]="owner"
      placeholder="Choose an owner"
      [kjOptions]="users"
      kjValueKey="id"
      kjLabelKey="name"
      kjGroupKey="team"
      kjGroupsCollapsible
      kjSearchable
      [kjDisplayWith]="unknownUser"
    />
  `,
})
export class KjSelectDataExample {
  readonly users: readonly User[] = [
    { id: 1, name: 'Ada', team: 'Platform' },
    { id: 2, name: 'Linus', team: 'Platform' },
    { id: 3, name: 'Grace', team: 'Design' },
  ];
  /** 42 is not in the list: the trigger shows `kjDisplayWith(42)`. */
  readonly owner = signal<number | undefined>(42);
  readonly unknownUser = (id: unknown): string => `User #${String(id)}`;
}
