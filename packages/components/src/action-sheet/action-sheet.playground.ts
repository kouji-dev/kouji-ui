import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { KjActionSheetService, type KjActionSheetAction } from './action-sheet.service';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. `title` sets the sheet heading and
 * `destructive` appends a danger-styled Delete row so the destructive register
 * can be previewed.
 */
const title = signal('Photo');
const destructive = signal(true);

@Component({
  selector: 'kj-action-sheet-playground',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Open action sheet</kj-button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjActionSheetPlaygroundDemo {
  protected readonly title = title;
  protected readonly destructive = destructive;

  private readonly actionSheet = inject(KjActionSheetService);

  protected open(): void {
    const actions: KjActionSheetAction<string>[] = [
      { label: 'Edit', value: 'edit' },
      { label: 'Duplicate', value: 'duplicate' },
    ];
    if (destructive()) {
      actions.push({ label: 'Delete', value: 'delete', role: 'destructive' });
    }
    this.actionSheet.open<string>({ title: title(), actions });
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjActionSheetPlaygroundDemo,
  state: {
    title: title as unknown as ReturnType<typeof signal>,
    destructive: destructive as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'toggle', name: 'destructive', label: 'destructive' },
  ],
  snippet: (values) => {
    const s = values as { title: string; destructive: boolean };
    const actions = [
      `    { label: 'Edit', value: 'edit' },`,
      `    { label: 'Duplicate', value: 'duplicate' },`,
    ];
    if (s.destructive) {
      actions.push(`    { label: 'Delete', value: 'delete', role: 'destructive' },`);
    }
    return `actionSheet.open({\n  title: '${s.title}',\n  actions: [\n${actions.join('\n')}\n  ],\n});`;
  },
};
