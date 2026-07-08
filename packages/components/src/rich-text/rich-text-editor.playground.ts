import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { KjRichTextFeature } from '@kouji-ui/core';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';
import { KjRichTextEditorComponent } from './rich-text-editor';
import { bold, italic, underline, link, defaultFeatures } from './features/index';

/**
 * Playground state — module-scope signals. Tunes the placeholder text, the
 * read-only flag, and which feature bundle drives the toolbar (`full` = every
 * default feature, `minimal` = bold/italic/underline/link only).
 */
const placeholder = signal('Start writing…');
const readonly = signal(false);
const features = signal<'full' | 'minimal'>('full');

/** Minimal feature subset used when the `features` control is set to `minimal`. */
function minimalFeatures(): KjRichTextFeature[] {
  return [bold(), italic(), underline(), link()];
}

@Component({
  selector: 'kj-rich-text-editor-playground',
  standalone: true,
  imports: [KjRichTextEditorComponent],
  template: `
    <kj-rich-text-editor
      kjLabel="Message"
      [kjPlaceholder]="placeholder()"
      [kjReadonly]="readonly()"
      [kjFeatures]="activeFeatures()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorPlaygroundDemo {
  protected readonly placeholder = placeholder;
  protected readonly readonly = readonly;
  protected readonly features = features;

  /** Resolve the chosen bundle to a fresh feature array on each selection. */
  protected readonly activeFeatures = computed<readonly KjRichTextFeature[]>(() =>
    features() === 'minimal' ? minimalFeatures() : defaultFeatures(),
  );
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjRichTextEditorPlaygroundDemo,
  state: {
    placeholder: placeholder as unknown as ReturnType<typeof signal>,
    readonly: readonly as unknown as ReturnType<typeof signal>,
    features: features as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'text', name: 'placeholder', label: 'placeholder' },
    { kind: 'toggle', name: 'readonly', label: 'readonly' },
    { kind: 'chips', name: 'features', label: 'features', options: ['full', 'minimal'] },
  ],
  snippet: (values) => {
    const s = values as { placeholder: string; readonly: boolean; features: string };
    const attrs: string[] = [`kjLabel="Message"`, `kjPlaceholder="${s.placeholder}"`];
    if (s.readonly) attrs.push('[kjReadonly]="true"');
    if (s.features === 'minimal') {
      attrs.push('[kjFeatures]="[bold(), italic(), underline(), link()]"');
    }
    return `<kj-rich-text-editor\n  ${attrs.join('\n  ')}\n/>`;
  },
};
