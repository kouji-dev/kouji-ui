import {
  Component,
  ChangeDetectionStrategy,
  forwardRef,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { DocsNavEntry } from '../../lib/build-docs-nav-tree';

@Component({
  selector: 'app-docs-nav-tree',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    forwardRef(() => DocsNavTreeComponent),
  ],
  templateUrl: './docs-nav-tree.html',
  styleUrl: './docs-nav-tree.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsNavTreeComponent {
  /** Nav nodes at this level. */
  readonly entries = input.required<DocsNavEntry[]>();
  /** Nesting depth; root is 0 (sets `role="tree"`). */
  readonly depth = input(0);
  /**
   * Optional id of the visible heading that names this tree (root level only).
   * When set, `aria-labelledby` is used instead of `aria-label`.
   */
  readonly labelledBy = input<string | null>(null);
  /** Which folder ids are expanded. */
  readonly expandedIds = input.required<ReadonlySet<string>>();
  readonly toggleFolder = output<string>();

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected onToggleFolder(id: string): void {
    this.toggleFolder.emit(id);
  }
}
