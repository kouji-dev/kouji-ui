import type { CompiledMask, Slot } from './input-mask.compile';

/** Callbacks injected into MaskEngine to decouple it from the DOM and Angular. */
export interface MaskEngineCallbacks {
  /** Returns the current display value in the input element. */
  getValue(): string;
  /** Sets the display value in the input element. */
  setValue(value: string): void;
  /** Returns the current caret position (selectionStart). */
  getCaret(): number;
  /** Moves the caret to the given position. */
  setCaret(pos: number): void;
  /** Called whenever the logical (raw or masked) value changes. */
  notifyChange(value: string): void;
}

/** Options for constructing a MaskEngine. */
export interface MaskEngineOptions {
  getCompiled(): CompiledMask;
  getSlotChar(): string;
  getMaskMode(): 'unmasked' | 'masked';
  callbacks: MaskEngineCallbacks;
}

/**
 * Pure state machine for the input-mask keyboard/paste/caret behaviour.
 * No Angular DI — constructed by the directive with callback closures.
 *
 * Responsibilities:
 * - Intercept keydown (printable chars, Backspace, Delete, arrow keys).
 * - Intercept paste events and sanitise clipboard content.
 * - Reconstruct a display string from raw characters.
 * - Emit the model value (raw or masked) via `notifyChange`.
 */
export class MaskEngine {
  private _composing = false;

  constructor(private readonly opts: MaskEngineOptions) {}

  // ── Public event handlers ──────────────────────────────────────────────

  /** Handle keyboard events. Printable chars, Backspace, Delete, navigation. */
  onKeydown(e: KeyboardEvent): void {
    if (this._composing) return;

    const { key, ctrlKey, metaKey, altKey } = e;

    // Pass through: ctrl/meta/alt combos (copy, paste, undo, …)
    if (ctrlKey || metaKey || altKey) return;
    // Pass through: Tab, Enter, Escape, function keys
    if (['Tab', 'Enter', 'Escape'].includes(key) || key.startsWith('F')) return;

    if (key === 'Backspace') {
      e.preventDefault();
      this._handleBackspace();
      return;
    }

    if (key === 'Delete') {
      e.preventDefault();
      this._handleDelete();
      return;
    }

    if (key === 'ArrowLeft') {
      e.preventDefault();
      this._snapCaret('prev');
      return;
    }

    if (key === 'ArrowRight') {
      e.preventDefault();
      this._snapCaret('next');
      return;
    }

    if (key === 'Home') {
      e.preventDefault();
      this._snapCaret('first');
      return;
    }

    if (key === 'End') {
      e.preventDefault();
      this._snapCaret('last');
      return;
    }

    // Printable character (single char, not a special key)
    if (key.length === 1) {
      e.preventDefault();
      this._insertChar(key);
    }
  }

  /** Handle the beforeinput event (IME, mobile keyboards). */
  onBeforeInput(e: InputEvent): void {
    if (this._composing) return;
    if (!e.data) return;
    if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
      e.preventDefault();
      for (const ch of e.data) {
        this._insertChar(ch);
      }
    }
  }

  /** Handle paste events — sanitise clipboard text into the mask. */
  onPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') ?? '';
    this._pasteText(text);
  }

  /** Composition start — hold off on keydown processing. */
  onCompositionStart(): void {
    this._composing = true;
  }

  /** Composition end — process the composed string. */
  onCompositionEnd(e: CompositionEvent): void {
    this._composing = false;
    if (e.data) {
      for (const ch of e.data) {
        this._insertChar(ch);
      }
    }
  }

  /**
   * Reconstruct a display string from a raw (unmasked) string.
   * Fills variable slots in order with characters from `raw`.
   * Returns the display string and the slot index after the last filled slot.
   */
  reconstructFromRaw(raw: string): { display: string; caretSlot: number } {
    const { slots, variableIndices } = this.opts.getCompiled();
    const slotChar = this.opts.getSlotChar();
    const filled = new Array<string | null>(slots.length).fill(null);
    let rawIdx = 0;

    for (const varIdx of variableIndices) {
      if (rawIdx >= raw.length) break;
      const slot = slots[varIdx] as Extract<Slot, { kind: 'variable' }>;
      const ch = raw[rawIdx];
      if (slot.re.test(ch)) {
        filled[varIdx] = ch;
        rawIdx++;
      } else {
        rawIdx++;
        // Try to keep going — skip non-matching raw chars
        // (handles masked input passed via setValue)
      }
    }

    const display = slots
      .map((slot, i) =>
        slot.kind === 'literal' ? slot.char : (filled[i] ?? slotChar),
      )
      .join('');

    // caretSlot: position just after the last filled variable, or first empty
    let caretSlot = variableIndices[0] ?? 0;
    for (let i = variableIndices.length - 1; i >= 0; i--) {
      if (filled[variableIndices[i]] !== null) {
        caretSlot = (variableIndices[i + 1] ?? variableIndices[i]) + (i + 1 < variableIndices.length ? 0 : 1);
        break;
      }
    }

    return { display, caretSlot };
  }

  /**
   * Reconstruct a display from a raw string, normalising the raw by stripping
   * chars that don't fit the variable slot sequence. Used when writing from a
   * form control setValue() call.
   */
  applyRawValue(raw: string): void {
    const { slots, variableIndices } = this.opts.getCompiled();
    const slotChar = this.opts.getSlotChar();
    const filled = new Array<string | null>(slots.length).fill(null);

    let rawIdx = 0;
    for (const varIdx of variableIndices) {
      if (rawIdx >= raw.length) break;
      const slot = slots[varIdx] as Extract<Slot, { kind: 'variable' }>;
      // skip chars that don't match (forgiving intake)
      while (rawIdx < raw.length && !slot.re.test(raw[rawIdx])) {
        rawIdx++;
      }
      if (rawIdx < raw.length) {
        filled[varIdx] = raw[rawIdx];
        rawIdx++;
      }
    }

    const display = slots
      .map((slot, i) =>
        slot.kind === 'literal' ? slot.char : (filled[i] ?? slotChar),
      )
      .join('');

    this.opts.callbacks.setValue(display);
    this._emitModelValue(filled);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private _getFilledSlots(): Array<string | null> {
    const { slots } = this.opts.getCompiled();
    const slotChar = this.opts.getSlotChar();
    const display = this.opts.callbacks.getValue();
    return slots.map((slot, i) => {
      if (slot.kind === 'literal') return null;
      const ch = display[i];
      return ch && ch !== slotChar ? ch : null;
    });
  }

  private _buildDisplay(filled: Array<string | null>): string {
    const { slots } = this.opts.getCompiled();
    const slotChar = this.opts.getSlotChar();
    return slots
      .map((slot, i) =>
        slot.kind === 'literal' ? slot.char : (filled[i] ?? slotChar),
      )
      .join('');
  }

  private _emitModelValue(filled: Array<string | null>): void {
    const { slots, variableIndices } = this.opts.getCompiled();
    const mode = this.opts.getMaskMode();
    let value: string;
    if (mode === 'unmasked') {
      value = variableIndices
        .map(i => filled[i] ?? '')
        .join('');
    } else {
      const slotChar = this.opts.getSlotChar();
      value = slots
        .map((slot, i) =>
          slot.kind === 'literal' ? slot.char : (filled[i] ?? slotChar),
        )
        .join('');
    }
    this.opts.callbacks.notifyChange(value);
  }

  private _insertChar(ch: string): void {
    const { variableIndices } = this.opts.getCompiled();
    const { slots } = this.opts.getCompiled();
    const caret = this.opts.callbacks.getCaret();
    const filled = this._getFilledSlots();

    // Find the next variable slot at or after caret
    const targetIdx = variableIndices.find(i => i >= caret);
    if (targetIdx === undefined) return; // mask is full or caret past end

    const slot = slots[targetIdx] as Extract<Slot, { kind: 'variable' }>;
    if (!slot.re.test(ch)) return; // char doesn't match slot regex

    filled[targetIdx] = ch;
    const display = this._buildDisplay(filled);
    this.opts.callbacks.setValue(display);
    this._emitModelValue(filled);

    // Advance caret to next variable slot
    const nextVar = variableIndices.find(i => i > targetIdx);
    const newCaret = nextVar !== undefined ? nextVar : targetIdx + 1;
    this.opts.callbacks.setCaret(newCaret);

    // Check completion
    const allFilled = variableIndices.every(i => filled[i] !== null);
    if (allFilled) {
      this.opts.callbacks.setCaret(variableIndices[variableIndices.length - 1] + 1);
    }
  }

  private _handleBackspace(): void {
    const { variableIndices } = this.opts.getCompiled();
    const caret = this.opts.callbacks.getCaret();
    const filled = this._getFilledSlots();

    // Find the last variable slot before caret
    const targets = variableIndices.filter(i => i < caret);
    const targetIdx = targets[targets.length - 1];
    if (targetIdx === undefined) return;

    filled[targetIdx] = null;
    const display = this._buildDisplay(filled);
    this.opts.callbacks.setValue(display);
    this._emitModelValue(filled);
    this.opts.callbacks.setCaret(targetIdx);
  }

  private _handleDelete(): void {
    const { variableIndices } = this.opts.getCompiled();
    const caret = this.opts.callbacks.getCaret();
    const filled = this._getFilledSlots();

    // Find the variable slot at or after caret
    const targetIdx = variableIndices.find(i => i >= caret);
    if (targetIdx === undefined) return;

    filled[targetIdx] = null;
    const display = this._buildDisplay(filled);
    this.opts.callbacks.setValue(display);
    this._emitModelValue(filled);
    this.opts.callbacks.setCaret(targetIdx);
  }

  private _snapCaret(direction: 'prev' | 'next' | 'first' | 'last'): void {
    const { variableIndices } = this.opts.getCompiled();
    if (variableIndices.length === 0) return;

    const caret = this.opts.callbacks.getCaret();

    if (direction === 'first') {
      this.opts.callbacks.setCaret(variableIndices[0]);
      return;
    }
    if (direction === 'last') {
      this.opts.callbacks.setCaret(
        variableIndices[variableIndices.length - 1] + 1,
      );
      return;
    }
    if (direction === 'prev') {
      const prev = [...variableIndices].reverse().find(i => i < caret);
      if (prev !== undefined) this.opts.callbacks.setCaret(prev);
      return;
    }
    if (direction === 'next') {
      const next = variableIndices.find(i => i > caret);
      if (next !== undefined) this.opts.callbacks.setCaret(next);
      return;
    }
  }

  private _pasteText(text: string): void {
    const { variableIndices } = this.opts.getCompiled();
    const { slots } = this.opts.getCompiled();
    const caret = this.opts.callbacks.getCaret();
    const filled = this._getFilledSlots();

    // Determine which variable slots we start filling from
    const startVarPos = variableIndices.findIndex(i => i >= caret);
    if (startVarPos === -1) return;

    let textIdx = 0;
    for (let vi = startVarPos; vi < variableIndices.length && textIdx < text.length; vi++) {
      const slotIdx = variableIndices[vi];
      const slot = slots[slotIdx] as Extract<Slot, { kind: 'variable' }>;
      // Skip paste chars that don't match
      while (textIdx < text.length && !slot.re.test(text[textIdx])) {
        textIdx++;
      }
      if (textIdx < text.length) {
        filled[slotIdx] = text[textIdx];
        textIdx++;
      }
    }

    const display = this._buildDisplay(filled);
    this.opts.callbacks.setValue(display);
    this._emitModelValue(filled);

    // Set caret after the last filled slot
    let lastFilledVar = variableIndices[startVarPos];
    for (const vi of variableIndices) {
      if (filled[vi] !== null) lastFilledVar = vi;
    }
    const nextVar = variableIndices.find(i => i > lastFilledVar);
    this.opts.callbacks.setCaret(nextVar !== undefined ? nextVar : lastFilledVar + 1);
  }
}
