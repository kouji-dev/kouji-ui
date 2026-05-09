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
 *   @doc-file avatar-group.example.ts
 * @doc-example Overflow
 *   @doc-file avatar-group.overflow.example.ts
 * @doc-example Sizes
 *   @doc-file avatar-group.sizes.example.ts
 * @doc-example Shapes
 *   @doc-file avatar-group.shapes.example.ts
 * @doc-example List
 *   @doc-file avatar-group.list.example.ts
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
