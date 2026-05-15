import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { KjAvatarGroup, KJ_AVATAR_GROUP, type KjAvatarGroupAriaLabelFormat, type KjAvatarShape } from '@kouji-ui/core';
import { KjAvatarComponent } from './avatar';

/**
 * Avatar group wrapper. Stacks projected `<kj-avatar>` children with a
 * count-aware `aria-label`, an overflow chip when `kjMax` is exceeded, and
 * RTL-aware z-index ordering — all handled by the composed `KjAvatarGroup`
 * core directive. The wrapper supplies the chip element and the host
 * `<ng-content/>` slot.
 *
 * The overflow chip is a regular `<kj-avatar>` rendering `'+N'` text; it is
 * `aria-hidden` because the group's count-aware label already conveys
 * totality (e.g. `"3 of 8 collaborators"`), so exposing the chip again would
 * duplicate the announcement.
 *
 * @doc-example Default
 *   The default playground — five stacked avatars with the group's defaults.
 *   @doc-file avatar-group.example.ts
 * @doc-example Usage
 *   The common shape: a small face-pile with an overflow chip, accessible label,
 *   and a list-mode variant for documents-shared screens.
 *   @doc-file avatar-group.usage.example.ts
 * @doc-example Overflow
 *   `kjMax` caps visible avatars; the remainder collapses into a "+N" chip.
 *   @doc-file avatar-group.overflow.example.ts
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
 * @doc-aria
 *   aria-label       — Count-aware label like "3 of 8 collaborators"; override via `kjAriaLabelOverride`
 *   role             — Defaults to `img` (face-pile); set `kjRole="list"` for a true list landmark
 *   aria-hidden      — Forced on the +N chip so the count isn't re-announced
 *
 * @doc-touch
 *   Stacked avatars are decorative — they aren't tab stops. Pair the group
 *   with an interactive trigger (button/link) sized ≥ 44×44 when clicking is
 *   meaningful (e.g. opens a collaborator dialog).
 *
 * @doc-a11y
 *   The face-pile is an `img` landmark with a count-aware accessible name so
 *   AT users hear "3 of 8 collaborators" rather than every initial. Switch to
 *   `role="list"` whenever the order/identity of each face matters
 *   semantically. The overflow chip is always `aria-hidden` because the
 *   group's name already conveys totality.
 *
 * @doc-related avatar,badge,tag
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
  imports: [KjAvatarComponent],
  template: `
    <ng-content />
    @if (overflowCount() > 0) {
      <kj-avatar
        class="kj-avatar-group-overflow"
        aria-hidden="true"
        [content]="overflowLabel()"
        [shape]="chipShape()"
      />
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-avatar-group',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAvatarGroupComponent {
  /**
   * Read-only handle to the composed `KjAvatarGroup` directive. The directive
   * `provide`s itself under `KJ_AVATAR_GROUP`, so injecting the token returns
   * the same instance and gives us access to `overflowCount`, `shape`, etc.
   */
  private readonly group = inject(KJ_AVATAR_GROUP);

  protected readonly overflowCount = this.group.overflowCount;

  protected readonly overflowLabel = computed(() => `+${this.overflowCount()}`);

  /**
   * Chip shape mirrors the group's default shape so the chip visually
   * matches the avatars. `<kj-avatar>`'s own `shape` default is `'circle'`,
   * which is also the group's default — so a missing group shape cleanly
   * collapses to `'circle'`.
   */
  protected readonly chipShape = computed<'circle' | 'rounded'>(
    () => (this.group.shape() as KjAvatarShape | undefined) ?? 'circle',
  );
}

export type { KjAvatarGroupAriaLabelFormat };
