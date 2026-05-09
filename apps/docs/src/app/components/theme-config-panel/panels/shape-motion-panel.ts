import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject } from '@angular/core';
import { KjOptionComponent, KjSelectComponent, KjTagComponent } from '@kouji-ui/components';
import { ThemeDraftService } from '../../../services/theme-draft.service';
import { ContrastScoreService } from '../../../services/contrast-score.service';
import { kjVariantForEdge } from '../../../lib/theme/edge-tag-variant';
import type { MotionKey, ShapeKey } from '../../../lib/theme/types';

@Component({
  selector: 'kj-shape-motion-panel',
  standalone: true,
  imports: [KjTagComponent, KjSelectComponent, KjOptionComponent],
  templateUrl: './shape-motion-panel.html',
  styleUrl: './shape-motion-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShapeMotionPanel {
  private readonly draftService = inject(ThemeDraftService);
  private readonly contrastScore = inject(ContrastScoreService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly draft = this.draftService.draft;

  protected readonly scoreReport = computed(() =>
    this.contrastScore.buildReport(this.draftService.resolvedTokens(), this.draftService.draft()),
  );

  protected readonly tagVariantForEdge = kjVariantForEdge;

  /**
   * Five corner-radius tiers for cards vs fields (replaces the old 0–32px sliders).
   * Preview swatches use `border-radius` only; stored values are pixel radii.
   */
  protected readonly radiusPresets = [
    { value: 0, label: 'Sharp', hint: '0px corner radius' },
    { value: 4, label: 'Subtle', hint: '4px corner radius' },
    { value: 8, label: 'Soft', hint: '8px corner radius' },
    { value: 16, label: 'Rounded', hint: '16px corner radius' },
    { value: 24, label: 'Pill', hint: '24px corner radius' },
  ] as const;

  /** Stroke widths for `--kj-border`; preview is a horizontal bar of that thickness. */
  protected readonly borderWidthPresets = [
    { value: 0, label: 'None', hint: '0px border' },
    { value: 1, label: 'Hairline', hint: '1px border' },
    { value: 2, label: 'Regular', hint: '2px border' },
    { value: 4, label: 'Bold', hint: '4px border' },
  ] as const;

  protected onShape(key: ShapeKey, value: number): void {
    this.draftService.setShape(key, value);
  }

  protected onRadiusPresetKeydown(
    ev: KeyboardEvent,
    index: number,
    key: 'radiusBox' | 'radiusField',
  ): void {
    const horizontal = ev.key === 'ArrowRight' || ev.key === 'ArrowLeft';
    const vertical = ev.key === 'ArrowDown' || ev.key === 'ArrowUp';
    if (!horizontal && !vertical) return;
    ev.preventDefault();
    const delta =
      ev.key === 'ArrowRight' || ev.key === 'ArrowDown'
        ? 1
        : -1;
    const next = Math.max(0, Math.min(this.radiusPresets.length - 1, index + delta));
    const preset = this.radiusPresets[next];
    this.onShape(key, preset.value);
    const prefix = key === 'radiusBox' ? 'kj-radius-box-preset' : 'kj-radius-field-preset';
    if (isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => document.getElementById(`${prefix}-${next}`)?.focus());
    }
  }

  protected onBorderWidthPresetKeydown(ev: KeyboardEvent, index: number): void {
    const horizontal = ev.key === 'ArrowRight' || ev.key === 'ArrowLeft';
    const vertical = ev.key === 'ArrowDown' || ev.key === 'ArrowUp';
    if (!horizontal && !vertical) return;
    ev.preventDefault();
    const delta =
      ev.key === 'ArrowRight' || ev.key === 'ArrowDown'
        ? 1
        : -1;
    const next = Math.max(0, Math.min(this.borderWidthPresets.length - 1, index + delta));
    const preset = this.borderWidthPresets[next];
    this.onShape('border', preset.value);
    if (isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => document.getElementById(`kj-border-width-preset-${next}`)?.focus());
    }
  }

  protected onDepthSelect(value: unknown): void {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return;
    this.draftService.setShape('depth', n);
  }

  protected onMotionSelect(key: MotionKey, value: unknown): void {
    if (typeof value !== 'string') return;
    this.draftService.setMotion(key, value);
  }
}
