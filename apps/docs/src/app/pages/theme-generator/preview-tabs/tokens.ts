import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { KjCardComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { oklchToHex } from '../../../lib/theme/theme-color-utils';
import type { BgSlot, FgSlot } from '../../../lib/theme/types';

interface ColorRow {
  readonly key: string;
  readonly value: string;
  readonly hex: string;
}

interface TypeRow {
  readonly label: string;
  readonly size: string;
}

const BG_KEYS: readonly BgSlot[] = [
  'bg-body', 'bg-surface', 'bg-field', 'bg-elevated',
  'bg-primary', 'bg-accent', 'bg-info', 'bg-success', 'bg-warning', 'bg-danger',
];

const FG_KEYS: readonly FgSlot[] = [
  'fg-default',
  'fg-on-primary', 'fg-on-accent', 'fg-on-info',
  'fg-on-success', 'fg-on-warning', 'fg-on-danger',
];

const TYPE_SCALE: readonly TypeRow[] = [
  { label: 'display / 48px',  size: '3rem' },
  { label: 'headline / 32px', size: '2rem' },
  { label: 'title / 20px',    size: '1.25rem' },
  { label: 'body / 16px',     size: '1rem' },
  { label: 'caption / 13px',  size: '0.8125rem' },
];

/**
 * Preview scene 08 — Tokens: raw values display.
 *
 * Mirrors SceneTokens from the React reference. Reads live from the draft
 * service so any control change updates the swatches in place.
 */
@Component({
  selector: 'kj-preview-tokens',
  standalone: true,
  imports: [KjCardComponent],
  templateUrl: './tokens.html',
  styleUrl: './tokens.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewTokens {
  private readonly draftService = inject(ThemeDraftService);
  protected readonly draft = this.draftService.draft;

  protected readonly bgRows = computed<ColorRow[]>(() =>
    BG_KEYS.map(k => {
      const v = this.draft().bg[k];
      return { key: k, value: v, hex: oklchToHex(v) };
    }),
  );

  protected readonly fgRows = computed<ColorRow[]>(() =>
    FG_KEYS.map(k => {
      const v = this.draft().fg[k];
      return { key: k, value: v, hex: oklchToHex(v) };
    }),
  );

  protected readonly typeScale = TYPE_SCALE;

  protected readonly radius = computed(() => this.draft().shape.radiusBox + 'px');
  protected readonly border = computed(() => this.draft().shape.border + 'px');
  protected readonly motion = computed(() => this.draft().motion.transition);
}
