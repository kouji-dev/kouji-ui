import { Injectable, inject } from '@angular/core';
import { KjSheetService } from '@kouji-ui/core';
import type { Observable } from 'rxjs';
import { KjActionSheet } from './action-sheet';

/** Presentation role of an action-sheet row. */
export type KjActionSheetRole = 'default' | 'destructive';

/** A single selectable action in an action sheet. */
export interface KjActionSheetAction<V = unknown> {
  /** Visible label. */
  label: string;
  /** Value resolved through the ref when this action is chosen. */
  value: V;
  /** Optional leading lucide icon name. */
  icon?: string;
  /** `'destructive'` renders danger styling. Defaults to `'default'`. */
  role?: KjActionSheetRole;
  /** Whether the row is non-interactive. */
  disabled?: boolean;
}

/** Configuration for {@link KjActionSheetService.open}. */
export interface KjActionSheetOptions<V = unknown> {
  /** Optional heading shown above the actions. */
  title?: string;
  /** Optional supporting text below the title. */
  description?: string;
  /** The selectable actions, top to bottom. */
  actions: KjActionSheetAction<V>[];
  /** Label for the separated cancel row. Defaults to `'Cancel'`. Pass `null` to omit. */
  cancelLabel?: string | null;
}

/**
 * Reference returned by {@link KjActionSheetService.open}. Resolves the chosen
 * action's `value`, or `undefined` when dismissed (Escape / backdrop / cancel).
 *
 * @doc-category Library/Overlay
 */
export class KjActionSheetRef<V = unknown> {
  /** Emits the selected value (or `undefined`) once the sheet has closed. */
  readonly afterClosed$: Observable<V | undefined>;
  /** Promise resolving with the selected value (or `undefined`). */
  readonly result: Promise<V | undefined>;

  constructor(private readonly sheetRef: {
    afterClosed$: Observable<V | undefined>;
    result: Promise<V | undefined>;
    close(result?: V): void;
  }) {
    this.afterClosed$ = sheetRef.afterClosed$;
    this.result = sheetRef.result;
  }

  /** Dismiss the action sheet programmatically. */
  close(result?: V): void {
    this.sheetRef.close(result);
  }
}

/**
 * Programmatic service for opening an **action sheet** — a data-driven,
 * iOS-style list of actions presented in a bottom sheet. Built on
 * {@link KjSheetService}; it adds no new overlay surface, only a styled
 * `role="menu"` action list on top of the bottom-sheet primitive.
 *
 * @doc-category Library/Overlay
 */
@Injectable({ providedIn: 'root' })
export class KjActionSheetService {
  private readonly sheet = inject(KjSheetService);

  /**
   * Open an action sheet.
   *
   * @param opts - Title, description, actions, and cancel label.
   * @returns A {@link KjActionSheetRef} resolving the selected value.
   */
  open<V = unknown>(opts: KjActionSheetOptions<V>): KjActionSheetRef<V> {
    const sheetRef = this.sheet.open<KjActionSheet<V>, V, KjActionSheetOptions<V>>(
      KjActionSheet,
      {
        data: opts,
        detent: 'auto',
        ariaLabel: opts.title ?? 'Actions',
      },
    );
    return new KjActionSheetRef<V>(sheetRef);
  }
}
