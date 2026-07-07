import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { KjLocale } from '../../locale/index';
import { KjLiveRegion } from '../../a11y/index';
import { KjButton } from '../../button/button';
import { FR_CATALOG, KjTranslate, KjTranslateService } from '../index';

/**
 * Demonstrates typed translation strings: a locale switch flips every visible
 * string, the localized `aria-label`, and the live-region announcement between
 * English and French — all driven by `KjLocale.setLocale` and resolved through
 * `KjTranslateService` / the `[kjTranslate]` directive.
 */
@Component({
  selector: 'kj-example-i18n-basic',
  standalone: true,
  imports: [KjTranslate, KjButton, KjLiveRegion],
  styleUrls: ['../../styles/docs-themes.css'],
  styles: [
    `
      :host {
        display: block;
        padding: 2rem;
        background: var(--kj-bg);
        color: var(--kj-text);
        font-family: var(--kj-font);
        min-height: 260px;
      }
      .switch {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
      }
      button[kjButton] {
        padding: 0.4rem 1rem;
        border: 1px solid var(--kj-border);
        background: var(--kj-surface);
        color: var(--kj-text);
        cursor: pointer;
        font-family: inherit;
        font-size: 0.8125rem;
        border-radius: var(--kj-radius);
      }
      button[kjButton][data-active='true'] {
        background: var(--kj-primary);
        color: var(--kj-primary-contrast, #0c0c0c);
        border-color: var(--kj-primary);
      }
      .panel {
        border: 1px solid var(--kj-border);
        border-radius: var(--kj-radius-lg);
        padding: 1.25rem;
        display: grid;
        gap: 0.85rem;
        max-width: 26rem;
      }
      .pageinfo {
        font-weight: 600;
        font-size: 1rem;
      }
      .pager {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .icon-btn {
        width: 2.25rem;
        height: 2.25rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--kj-border);
        background: var(--kj-surface);
        color: var(--kj-text);
        border-radius: var(--kj-radius);
        cursor: pointer;
        font-size: 1rem;
      }
      .close-note {
        font-size: 0.8125rem;
        opacity: 0.75;
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="switch" role="group" aria-label="Language">
      <button
        kjButton
        data-testid="locale-en"
        [attr.data-active]="isEnglish()"
        (click)="setLocale('en-US')"
      >
        English
      </button>
      <button
        kjButton
        data-testid="locale-fr"
        [attr.data-active]="!isEnglish()"
        (click)="setLocale('fr-FR')"
      >
        Français
      </button>
    </div>

    <div class="panel">
      <!-- Visible, interpolated "Page N of M" string -->
      <div
        class="pageinfo"
        data-testid="page-info"
        [kjTranslate]="'pagination.pageOf'"
        [kjTranslateParams]="{ page: page(), total: total }"
      ></div>

      <div class="pager">
        <!-- Localized aria-label written onto the button host -->
        <button
          class="icon-btn"
          data-testid="prev-btn"
          [kjTranslate]="'pagination.previous'"
          kjTranslateAttr="aria-label"
          [disabled]="page() <= 1"
          (click)="go(-1)"
        >
          ‹
        </button>
        <button
          class="icon-btn"
          data-testid="next-btn"
          [kjTranslate]="'pagination.next'"
          kjTranslateAttr="aria-label"
          [disabled]="page() >= total"
          (click)="go(1)"
        >
          ›
        </button>
      </div>

      <!-- Localized close-button aria-label -->
      <div class="close-note">
        <button
          class="icon-btn"
          data-testid="close-btn"
          [kjTranslate]="'toast.close'"
          kjTranslateAttr="aria-label"
        >
          ×
        </button>
        <span [kjTranslate]="'toast.close'" data-testid="close-text"></span>
      </div>
    </div>

    <!-- Polite live region; announces the localized page-change string -->
    <div
      kjLiveRegion
      #live="kjLiveRegion"
      class="visually-hidden"
      data-testid="live"
    ></div>
  `,
})
export class I18nBasicExample {
  private readonly locale = inject(KjLocale);
  private readonly i18n = inject(KjTranslateService);
  private readonly live = viewChild.required<KjLiveRegion>('live');

  readonly total = 12;
  readonly page = signal(3);
  readonly isEnglish = computed(() => !this.locale.locale().startsWith('fr'));

  constructor() {
    // Register the French catalog for this demo (app-level singleton service).
    this.i18n.register('fr', FR_CATALOG);
  }

  setLocale(tag: string): void {
    this.locale.setLocale(tag);
  }

  go(delta: number): void {
    const next = Math.min(this.total, Math.max(1, this.page() + delta));
    this.page.set(next);
    this.live().announce(
      this.i18n.translate('a11y.pageChanged', {
        page: next,
        total: this.total,
      }),
    );
  }
}
