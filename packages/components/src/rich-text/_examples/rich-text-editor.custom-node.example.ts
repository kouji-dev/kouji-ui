import { ChangeDetectionStrategy, Component } from '@angular/core';
import * as lexical from 'lexical';
import { createKjDecoratorNode, injectRichTextNode, type KjRichTextFeature } from '@kouji-ui/core';
import { KjRichTextEditorComponent } from '../rich-text-editor';
import { defaultFeatures } from '../features/default-features';

/** Angular component rendered for each badge node; reads its data via injection. */
@Component({
  selector: 'kj-badge-chip',
  standalone: true,
  template: `<span class="kj-badge-chip" role="img" [attr.aria-label]="'Badge: ' + label">{{
    label
  }}</span>`,
  styles: [
    `
      .kj-badge-chip {
        display: inline-block;
        padding: 0.1em 0.5em;
        border-radius: 999px;
        background: var(--kj-bg-primary, #4f46e5);
        color: var(--kj-fg-on-primary, #fff);
        font-size: 0.8em;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeChip {
  protected readonly label =
    injectRichTextNode<{ getData(): { label?: string } }>().getData().label ?? 'Badge';
}

// ─── A custom feature: its own node + toolbar button, in ~15 lines ───
const badge = createKjDecoratorNode<{ label: string }>(lexical, {
  type: 'kj-badge',
  component: BadgeChip,
  inline: true,
  ariaLabel: 'Badge',
});

export const badgeFeature: KjRichTextFeature = {
  name: 'badge',
  nodes: () => [badge.Node],
  decorators: [{ nodeType: 'kj-badge', component: BadgeChip }],
  toolbar: [
    {
      id: 'badge',
      group: 'insert',
      order: 20,
      icon: 'sparkles',
      label: 'Insert badge',
      kind: 'button',
      run: (ctx) => {
        ctx.insertNodes(() => [badge.$create({ label: 'New' })]);
        ctx.focus();
        ctx.announce('Badge inserted');
      },
    },
  ],
};

/**
 * Demonstrates the feature framework: a custom Angular-rendered node with its
 * own toolbar button, composed alongside the default features — the toolbar
 * picks up the new button automatically.
 */
@Component({
  selector: 'kj-rich-text-editor-custom-node-example',
  standalone: true,
  imports: [KjRichTextEditorComponent],
  template: `<kj-rich-text-editor kjLabel="Notes" [kjFeatures]="features" [kjValue]="initial" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorCustomNodeExample {
  protected readonly initial = '<p>The “Insert badge” button comes from a custom feature.</p>';
  protected readonly features: KjRichTextFeature[] = [...defaultFeatures(), badgeFeature];
}
