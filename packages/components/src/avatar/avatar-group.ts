import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChild,
  contentChildren,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  KjAvatarGroup,
  KJ_AVATAR_GROUP,
  KjOverflowContent,
  KjPopoverTrigger,
  KjTranslateService,
  type KjAvatarGroupAriaLabelFormat,
  type KjAvatarShape,
} from '@kouji-ui/core';
import { KjAvatarComponent } from './avatar';
import { KjOverflowPanelComponent } from '../overflow/overflow-panel';

/**
 * Avatar group wrapper. Stacks projected `<kj-avatar>` children with a
 * count-aware `aria-label`, an overflow chip when `kjMax` is exceeded, and
 * RTL-aware z-index ordering — all handled by the composed `KjAvatarGroup`
 * core directive. The wrapper supplies the chip element and the host
 * `<ng-content/>` slot.
 *
 * The overflow chip is a button: hovering, focusing or tapping it opens a
 * panel listing the collapsed avatars (their `alt`, else their text content).
 * Project an `<ng-template kjOverflowContent>` to render that panel yourself —
 * the context carries the collapsed range (`start`/`end`) so the consumer
 * slices its own data and adds actions (remove, open a profile…).
 *
 * The `<kj-avatar>` inside the chip renders `'+N'` and is `aria-hidden`
 * because the group's count-aware label already conveys totality (e.g.
 * `"3 of 8 collaborators"`); the button itself is named "Show N more".
 *
 * @doc-example Default
 *   The default playground — five stacked avatars with the group's defaults.
 *   @doc-file avatar-group.example.ts
 * @doc-example Usage
 *   The common shape: a small face-pile with an overflow chip, accessible label,
 *   and a list-mode variant for documents-shared screens.
 *   @doc-file avatar-group.usage.example.ts
 * @doc-example Overflow
 *   `kjMax` caps visible avatars; the remainder collapses into a "+N" chip whose
 *   hover panel lists the hidden names.
 *   @doc-file avatar-group.overflow.example.ts
 * @doc-example Overflow template
 *   `<ng-template kjOverflowContent>` renders the hidden avatars your way — here
 *   with a remove action per collaborator.
 *   @doc-file avatar-group.overflow-template.example.ts
 * @doc-example Sizes
 *   Group `kjSize` cascades onto every projected `<kj-avatar>` for a uniform pile.
 *   @doc-file avatar-group.sizes.example.ts
 * @doc-example Shapes
 *   Group `kjShape` cascades to children; the +N chip mirrors it for a consistent silhouette.
 *   @doc-file avatar-group.shapes.example.ts
 * @doc-example List
 *   `kjRole="list"` switches to a list landmark — use for "shared by" rows in docs UIs.
 *   @doc-file avatar-group.list.example.ts
 *
 * @doc-keyboard
 *   Tab             — Focuses the "+N" chip; the panel opens
 *   ArrowDown|Enter — Moves focus into the panel
 *   Escape          — Closes the panel and returns focus to the chip
 *
 * @doc-aria
 *   aria-label       — Count-aware label like "3 of 8 collaborators"; override via `kjAriaLabelOverride`
 *   role             — Defaults to `img` (face-pile); set `kjRole="list"` for a true list landmark
 *   aria-hidden      — Forced on the +N avatar so the count isn't re-announced; the chip button is named "Show N more"
 *   aria-expanded    — Reflects the panel state on the chip button
 *
 * @doc-touch
 *   Stacked avatars are decorative — they aren't tab stops. The "+N" chip is
 *   a real button (tap opens the panel); pair the group with an interactive
 *   trigger sized ≥ 44×44 when clicking an avatar is meaningful.
 *
 * @doc-a11y
 *   The face-pile is an `img` landmark with a count-aware accessible name so
 *   AT users hear "3 of 8 collaborators" rather than every initial. Switch to
 *   `role="list"` whenever the order/identity of each face matters
 *   semantically. The "+N" chip is a named button, so the collapsed names are
 *   one keystroke away for keyboard and screen-reader users.
 *
 * @doc-related avatar,badge,tag,overflow
 *
 * @doc-css-var
 *   --kj-avatar-size    — Avatar diameter. Sizes (xs/sm/md/lg/xl) override.
 *   --kj-avatar-bg      — Avatar background. Defaults to --kj-bg-field; the +N chip inherits this too.
 *   --kj-avatar-fg      — Avatar foreground (initials, fallback glyph). Defaults to --kj-fg-default.
 *   --kj-avatar-radius  — Corner radius. `circle` shape pins it to 9999px; `rounded` swaps to --kj-radius-box.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name avatar
 * @doc-description Themed avatar facepile that stacks avatars with an overflow chip and an accessible count label.
 * @doc-is-main
 */
@Component({
  selector: 'kj-avatar-group',
  standalone: true,
  hostDirectives: [
    {
      directive: KjAvatarGroup,
      inputs: [
        'kjMax',
        'kjTotal',
        'kjSize',
        'kjShape',
        'kjAriaLabel',
        'kjAriaLabelFormat',
        'kjRole',
        'kjAriaLabelOverride',
      ],
    },
  ],
  imports: [KjAvatarComponent, KjPopoverTrigger, KjOverflowPanelComponent],
  template: `
    <ng-content />
    @if (overflowCount() > 0) {
      <button
        type="button"
        class="kj-overflow-trigger kj-avatar-group-overflow-trigger"
        kjPopoverTrigger
        kjTrigger="hover"
        #trg="kjPopoverTrigger"
        [attr.aria-label]="overflowAriaLabel()"
        (keydown.arrowdown)="focusPanel($event)"
        (keydown.enter)="focusPanel($event)"
      >
        <kj-avatar
          class="kj-avatar-group-overflow"
          aria-hidden="true"
          [content]="overflowLabel()"
          [shape]="chipShape()"
        />
      </button>
      <kj-overflow-panel
        [kjFor]="trg"
        [kjCount]="overflowCount()"
        [kjStart]="group.visibleCount()"
        [kjEnd]="group.total()"
        [kjLabels]="hiddenLabels()"
        [kjTemplate]="overflowTemplate()"
      />
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-avatar-group',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarGroupComponent {
  /**
   * Read-only handle to the composed `KjAvatarGroup` directive. The directive
   * `provide`s itself under `KJ_AVATAR_GROUP`, so injecting the token returns
   * the same instance and gives us access to `overflowCount`, `shape`, etc.
   */
  protected readonly group = inject(KJ_AVATAR_GROUP);
  private readonly i18n = inject(KjTranslateService);

  /** Text of the "+N" chip. Defaults to the `overflow.more` translation (`+{count}`). */
  readonly kjOverflowLabel = input<((count: number) => string) | undefined>(undefined);
  /** Accessible name of the chip button. Defaults to the `overflow.show` translation (`Show {count} more`). */
  readonly kjOverflowAriaLabel = input<((count: number) => string) | undefined>(undefined);

  private readonly avatars = contentChildren(KjAvatarComponent, { descendants: true });
  protected readonly overflowTemplate = contentChild(KjOverflowContent);
  private readonly panel = viewChild(KjOverflowPanelComponent);

  protected readonly overflowCount = this.group.overflowCount;

  protected readonly overflowLabel = computed(() => {
    const n = this.overflowCount();
    return this.kjOverflowLabel()?.(n) ?? this.i18n.translate('overflow.more', { count: n });
  });

  protected readonly overflowAriaLabel = computed(() => {
    const n = this.overflowCount();
    return this.kjOverflowAriaLabel()?.(n) ?? this.i18n.translate('overflow.show', { count: n });
  });

  /** Labels of the collapsed avatars: `alt`, else a string `content`. */
  protected readonly hiddenLabels = computed<readonly string[]>(() =>
    this.avatars()
      .slice(this.group.visibleCount())
      .map((a) => a.alt() ?? (typeof a.content() === 'string' ? (a.content() as string) : '')),
  );

  /**
   * Chip shape mirrors the group's default shape so the chip visually
   * matches the avatars. `<kj-avatar>`'s own `shape` default is `'circle'`,
   * which is also the group's default — so a missing group shape cleanly
   * collapses to `'circle'`.
   */
  protected readonly chipShape = computed<'circle' | 'rounded'>(
    () => (this.group.shape() as KjAvatarShape | undefined) ?? 'circle',
  );

  protected focusPanel(event: Event): void {
    event.preventDefault();
    this.panel()?.focusFirst();
  }
}

export type { KjAvatarGroupAriaLabelFormat };
