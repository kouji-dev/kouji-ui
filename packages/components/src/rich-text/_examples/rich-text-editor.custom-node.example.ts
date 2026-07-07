import { ChangeDetectionStrategy, Component } from '@angular/core';
import * as lexical from 'lexical';
import { $getRoot, $insertNodes } from 'lexical';
import {
  KjRichTextEditor,
  KjRichTextExtensionDirective,
  createKjDecoratorNode,
  injectRichTextNode,
  type KjRichTextExtension,
} from '@kouji-ui/core';

/**
 * The Angular component rendered for each badge node. It reads its node's data
 * via {@link injectRichTextNode}. Kept non-interactive (not a keyboard trap); its
 * visible text is its accessible name.
 */
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
        line-height: 1.4;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeChip {
  protected readonly label =
    injectRichTextNode<{ getData(): { label?: string } }>().getData().label ?? 'Badge';
}

// ─── Define + register a custom decorator node from OUTSIDE the engine ───
// Everything below is all a consumer writes to add a first-class node type.
const badge = createKjDecoratorNode<{ label: string }>(lexical, {
  type: 'kj-badge',
  component: BadgeChip,
  inline: true,
  ariaLabel: 'Badge',
});

/** The extension: contributes the node class + its Angular decorator component. */
export const badgeExtension: KjRichTextExtension = {
  name: 'badge',
  nodes: () => [badge.Node],
  decorators: [{ nodeType: 'kj-badge', component: BadgeChip }],
};

/**
 * Demonstrates the rich-text extension framework: a custom Angular-rendered
 * decorator node registered via the `[kjRichTextExtension]` directive and
 * inserted with the node factory returned by `createKjDecoratorNode`.
 */
@Component({
  selector: 'kj-rich-text-editor-custom-node-example',
  standalone: true,
  imports: [KjRichTextEditor, KjRichTextExtensionDirective],
  template: `
    <div class="kj-rte-demo">
      <button type="button" class="kj-rte-demo__btn" (click)="insertBadge(ed)">Insert badge</button>
      <div
        #ed="kjRichTextEditor"
        kjRichTextEditor
        class="kj-rte-demo__surface"
        aria-label="Notes with custom badges"
        [kjRichTextExtension]="badgeExtension"
        [kjValue]="initial"
      ></div>
    </div>
  `,
  styles: [
    `
      .kj-rte-demo {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .kj-rte-demo__btn {
        align-self: flex-start;
        min-height: 2.25rem;
        padding: 0 0.75rem;
        border: 1px solid var(--kj-border-default, #d4d4d8);
        border-radius: var(--kj-radius-field, 0.375rem);
        background: var(--kj-bg-field, #fff);
        color: var(--kj-fg-default, #18181b);
        cursor: pointer;
      }
      .kj-rte-demo__surface {
        min-height: 8rem;
        padding: 0.75rem;
        border: 1px solid var(--kj-border-default, #d4d4d8);
        border-radius: var(--kj-radius-field, 0.375rem);
        outline: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorCustomNodeExample {
  protected readonly initial =
    '<p>Custom nodes are defined outside the engine. Click “Insert badge”.</p>';
  protected readonly badgeExtension = badgeExtension;

  protected insertBadge(ed: KjRichTextEditor): void {
    const editor = ed.editor();
    editor?.focus();
    editor?.update(() => {
      $getRoot().selectEnd();
      $insertNodes([badge.$create({ label: 'New' })]);
    });
  }
}
