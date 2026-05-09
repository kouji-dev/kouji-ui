import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  buildSeedSwatchMatrix,
  HUE_FAMILY_LABELS,
  resolveSeedSwatchMatrixToHex,
  type HueFamily,
  type SeedHueColumn,
} from '../../lib/theme/seed-swatches';

@Component({
  selector: 'kj-seed-swatch-grid',
  standalone: true,
  templateUrl: './seed-swatch-grid.html',
  styleUrl: './seed-swatch-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Dynamic Daisy-style matrix: {@link buildSeedSwatchMatrix} (OKLCH specs) →
 * {@link resolveSeedSwatchMatrixToHex} for display. Each **column** is one hue,
 * **10 shades per row** spread horizontally (light left → dark right). Swatches are hex-only in the UI.
 */
export class SeedSwatchGrid {
  readonly activeHex = input<string | null>(null);
  readonly layout = input<'strip' | 'palette'>('strip');
  readonly seedPicked = output<string>();

  protected readonly columns = computed<readonly SeedHueColumn[]>(() =>
    resolveSeedSwatchMatrixToHex(buildSeedSwatchMatrix()),
  );

  protected isActive(hex: string): boolean {
    return (this.activeHex() ?? '').toLowerCase() === hex.toLowerCase();
  }

  protected pick(hex: string): void {
    this.seedPicked.emit(hex);
  }

  protected familyLabel(family: HueFamily): string {
    return HUE_FAMILY_LABELS[family];
  }
}
