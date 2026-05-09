import { Location } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  forwardRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  private readonly router = inject(Router);
  private readonly location = inject(Location);

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

  /**
   * Mirrors exact `routerLinkActive` for `aria-selected` on tree leaves (required with `role="treeitem"`).
   * Uses `Location` + `serializeUrl` instead of `Router.isActive` so SSR/prerender stays stable.
   */
  protected leafSelected(routerLink: string[]): boolean {
    const current = this.location.path().split(/[?#]/)[0] ?? '';
    const target = this.router.serializeUrl(this.router.createUrlTree(routerLink));
    return current === target;
  }
}
