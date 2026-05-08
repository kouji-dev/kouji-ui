import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SEED_SWATCHES, HUE_FAMILIES, type SeedSwatch, type HueFamily } from '../../lib/theme/seed-swatches';

@Component({
  selector: 'kj-seed-swatch-grid',
  standalone: true,
  templateUrl: './seed-swatch-grid.html',
  styleUrl: './seed-swatch-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Curated seed-color picker grid grouped by hue family. Emits the chosen hex on click; the active swatch is signalled via `aria-pressed`. */
export class SeedSwatchGrid {
  /** Hex of the currently selected seed (e.g. the draft's `primary`); compared case-insensitively. `null` clears any active ring. */
  readonly activeHex = input<string | null>(null);
  /** Emits the swatch's hex when the user clicks one. */
  readonly seedPicked = output<string>();

  protected readonly grouped = computed<{ family: HueFamily; items: readonly SeedSwatch[] }[]>(() =>
    HUE_FAMILIES.map(family => ({
      family,
      items: SEED_SWATCHES.filter(s => s.hueFamily === family),
    })).filter(g => g.items.length > 0),
  );

  protected isActive(hex: string): boolean {
    return (this.activeHex() ?? '').toLowerCase() === hex.toLowerCase();
  }

  protected pick(hex: string): void {
    this.seedPicked.emit(hex);
  }
}
