import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  KjFormComponent,
  KjFormActionsComponent,
  KjFormSummaryComponent,
} from './form';
import { KjFieldComponent, KjFieldLabelComponent } from '../field/field';
import { KjInputComponent } from '../input/input';
import { KjButtonComponent } from '../button/button';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals. Field count plus the structural
 * toggles (summary, action row, async submit) drive the canonical form
 * recipe. The reactive `FormGroup` is rebuilt whenever the field count
 * changes so each row owns a live control.
 */
const fieldCount = signal<1 | 2 | 3>(2);
const showSummary = signal(true);
const showActions = signal(true);
const asyncSubmit = signal(false);

const FIELDS: ReadonlyArray<{ name: string; label: string; type: 'email' | 'password' | 'text'; placeholder: string }> = [
  { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
  { name: 'password', label: 'Password', type: 'password', placeholder: '' },
  { name: 'company', label: 'Company', type: 'text', placeholder: 'Acme Inc.' },
];

@Component({
  selector: 'kj-form-playground',
  standalone: true,
  imports: [
    KjFormComponent,
    KjFormActionsComponent,
    KjFormSummaryComponent,
    KjFieldComponent,
    KjFieldLabelComponent,
    KjInputComponent,
    KjButtonComponent,
    ReactiveFormsModule,
  ],
  styles: [`:host { display: block; max-width: 480px; }`],
  template: `
    <form kj-form [formGroup]="form()" [kjAsyncSubmit]="resolvedHandler()" (kjSubmit)="onSubmit()">
      @if (showSummary()) {
        <kj-form-summary />
      }
      @for (f of visibleFields(); track f.name) {
        <kj-field>
          <kj-field-label>{{ f.label }}</kj-field-label>
          <kj-input
            [type]="f.type"
            [formControlName]="f.name"
            [placeholder]="f.placeholder"
          />
        </kj-field>
      }
      @if (showActions()) {
        <kj-form-actions>
          <kj-button kjVariant="ghost" kjType="reset">Cancel</kj-button>
          <kj-button kjType="submit" [kjLoading]="busy()">Save</kj-button>
        </kj-form-actions>
      }
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFormPlaygroundDemo {
  protected readonly fieldCount = fieldCount;
  protected readonly showSummary = showSummary;
  protected readonly showActions = showActions;
  protected readonly asyncSubmit = asyncSubmit;
  protected readonly busy = signal(false);

  protected readonly visibleFields = computed(() => FIELDS.slice(0, fieldCount()));

  protected readonly resolvedHandler = computed(() =>
    this.asyncSubmit() ? () => new Promise<void>((r) => setTimeout(r, 800)) : undefined,
  );

  protected readonly form = computed(() => {
    const group: Record<string, FormControl> = {};
    for (const f of this.visibleFields()) {
      const validators = [Validators.required];
      if (f.type === 'email') validators.push(Validators.email);
      if (f.type === 'password') validators.push(Validators.minLength(8));
      group[f.name] = new FormControl('', validators);
    }
    return new FormGroup(group);
  });

  protected onSubmit(): void {
    this.busy.set(true);
    setTimeout(() => this.busy.set(false), 800);
  }
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjFormPlaygroundDemo,
  state: {
    fieldCount: fieldCount as unknown as ReturnType<typeof signal>,
    showSummary: showSummary as unknown as ReturnType<typeof signal>,
    showActions: showActions as unknown as ReturnType<typeof signal>,
    asyncSubmit: asyncSubmit as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'fieldCount', label: 'fields', options: [1, 2, 3] },
    { kind: 'toggle', name: 'showSummary', label: 'with summary' },
    { kind: 'toggle', name: 'showActions', label: 'with actions' },
    { kind: 'toggle', name: 'asyncSubmit', label: 'async submit' },
  ],
  snippet: (values) => {
    const s = values as {
      fieldCount: number;
      showSummary: boolean;
      showActions: boolean;
      asyncSubmit: boolean;
    };
    const formAttrs: string[] = ['[formGroup]="form"', '(kjSubmit)="onSubmit()"'];
    if (s.asyncSubmit) formAttrs.push('[kjAsyncSubmit]="submitHandler"');
    const rows: string[] = [];
    if (s.showSummary) rows.push('  <kj-form-summary />');
    rows.push(
      ...Array.from(FIELDS.slice(0, s.fieldCount)).map((f) => {
        const ph = f.placeholder ? ` placeholder="${f.placeholder}"` : '';
        return (
          `  <kj-field>\n` +
          `    <kj-field-label>${f.label}</kj-field-label>\n` +
          `    <kj-input type="${f.type}" formControlName="${f.name}"${ph} />\n` +
          `  </kj-field>`
        );
      }),
    );
    if (s.showActions) {
      rows.push(
        `  <kj-form-actions>\n` +
        `    <kj-button kjVariant="ghost" kjType="reset">Cancel</kj-button>\n` +
        `    <kj-button kjType="submit">Save</kj-button>\n` +
        `  </kj-form-actions>`,
      );
    }
    return `<form kj-form\n  ${formAttrs.join('\n  ')}\n>\n${rows.join('\n')}\n</form>`;
  },
};
