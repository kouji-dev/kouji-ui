import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjIconDirective } from '@kouji-ui/core';
import { KjInputComponent } from '../../input/input';
import { KjButtonComponent } from '../../button/button';
import { LUCIDE_ICON_NAMES } from '../lucide/icon-names';

/**
 * Lucide icon gallery with a live substring filter. Each tile renders the icon
 * via the `kjIcon` directive, which goes through the lazy loader registered by
 * `provideLucideLoader()` — only icons currently mounted in the DOM trigger a
 * dynamic per-icon `import()`. Click a tile to copy its `<i kjIcon="…">`
 * snippet to the clipboard.
 */
@Component({
  selector: 'kj-icon-gallery-example',
  standalone: true,
  imports: [FormsModule, KjIconDirective, KjInputComponent, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [`
    kj-icon-gallery-example {
      display: block; }
    kj-icon-gallery-example .gallery-header {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-sm);
      margin-bottom: var(--kj-space-lg);
    }
    kj-icon-gallery-example .gallery-title {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--kj-space-md);
      flex-wrap: wrap;
    }
    kj-icon-gallery-example .gallery-title h3 {
      margin: 0;
      font-size: var(--kj-font-size-lg, 1.125rem);
      font-weight: 600;
      color: var(--kj-fg-default, currentColor);
    }
    kj-icon-gallery-example .gallery-count {
      font-size: var(--kj-font-size-sm, 0.875rem);
      color: var(--kj-fg-muted, currentColor);
      font-variant-numeric: tabular-nums;
    }
    kj-icon-gallery-example .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--kj-space-md);
    }
    kj-icon-gallery-example .gallery-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--kj-space-xs);
      min-height: 88px;
      padding: var(--kj-space-md);
      border: 1px solid var(--kj-border-default, rgba(0, 0, 0, 0.12));
      border-radius: var(--kj-radius-md, 8px);
      background: var(--kj-bg-body, transparent);
      color: inherit;
      font: inherit;
      cursor: pointer;
      transition: background-color 120ms ease, border-color 120ms ease;
    }
    kj-icon-gallery-example .gallery-tile:hover,
    kj-icon-gallery-example .gallery-tile:focus-visible {
      background: var(--kj-bg-surface, rgba(0, 0, 0, 0.04));
      border-color: var(--kj-border-default, rgba(0, 0, 0, 0.24));
      outline: none;
    }
    kj-icon-gallery-example .gallery-tile:focus-visible {
      box-shadow: 0 0 0 2px var(--kj-bg-primary, #5b8def);
    }
    kj-icon-gallery-example .gallery-tile i.kj-icon {
      font-size: 24px;
    }
    kj-icon-gallery-example .gallery-tile .name {
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: lowercase;
      color: var(--kj-fg-muted, currentColor);
      word-break: break-all;
      text-align: center;
      line-height: 1.2;
    }
    kj-icon-gallery-example .gallery-empty { text-align: center;
      color: var(--kj-fg-muted, currentColor);
      border: 1px dashed var(--kj-border-default, rgba(0, 0, 0, 0.12));
      border-radius: var(--kj-radius-md, 8px);
    }
    kj-icon-gallery-example .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `],
  template: `
    <header class="gallery-header">
      <div class="gallery-title">
        <h3 id="kj-icon-gallery-heading">Lucide icons</h3>
        <span class="gallery-count" aria-live="polite">
          {{ filtered().length }} of {{ total }} shown
        </span>
      </div>
      <label class="visually-hidden" for="kj-icon-gallery-search">
        Search icons by name
      </label>
      <kj-input
        id="kj-icon-gallery-search"
        type="search"
        placeholder="Search icons..."
        aria-label="Search icons by name"
        [ngModel]="query()"
        (ngModelChange)="query.set($event)"
      />
    </header>

    @if (filtered().length === 0) {
      <p class="gallery-empty" role="status">
        No icons match &ldquo;{{ query() }}&rdquo;.
      </p>
    } @else {
      <ul
        class="gallery-grid"
        role="list"
        aria-labelledby="kj-icon-gallery-heading"
      >
        @for (name of filtered(); track name) {
          <li>
            <kj-button
              kjVariant="ghost"
              class="gallery-tile"
              [attr.aria-label]="'Copy icon snippet for ' + name"
              (click)="copy(name)"
            >
              <i [kjIcon]="name"></i>
              <span class="name">{{ name }}</span>
            </kj-button>
          </li>
        }
      </ul>
    }

    <div class="visually-hidden" role="status" aria-live="polite">
      {{ announcement() }}
    </div>
  `,
})
export class KjIconGalleryExample {
  protected readonly total = LUCIDE_ICON_NAMES.length;
  protected readonly query = signal('');
  protected readonly announcement = signal('');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return LUCIDE_ICON_NAMES;
    return LUCIDE_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  });

  protected async copy(name: string): Promise<void> {
    const snippet = `<i kjIcon="${name}"></i>`;
    try {
      // `navigator.clipboard` is unavailable in non-secure contexts (e.g. SSR);
      // fall back silently to a textarea so the example still works locally.
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snippet);
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = snippet;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.announcement.set(`Copied snippet for ${name}`);
    } catch {
      this.announcement.set(`Could not copy snippet for ${name}`);
    }
  }
}
