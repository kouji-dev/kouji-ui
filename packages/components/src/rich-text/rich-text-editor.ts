import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  KjIconDirective,
  KjLiveRegion,
  KjRichTextEditor,
  KjRovingTabindex,
  KjRovingTabindexItemDirective,
  type KjBlockType,
  type KjTextFormat,
} from '@kouji-ui/core';

let kjRteUid = 0;

/**
 * Styled, accessible rich-text editor composing the headless
 * {@link KjRichTextEditor} core directive with a `role="toolbar"` of formatting
 * controls (roving tabindex, `aria-pressed` state) and screen-reader
 * announcements on every command.
 *
 * Supports bold/italic/underline/strikethrough/inline-code, headings, quotes,
 * ordered & unordered lists, links, code blocks, images, undo/redo, and
 * markdown shortcuts. Content flows in/out via `kjValue` + `valueChange`, and
 * the underlying directive is a form-control (usable with `ngModel`).
 *
 * @example
 * ```html
 * <kj-rich-text-editor kjLabel="Message" [(kjValue)]="html" />
 * ```
 * @doc-category Library/Forms
 * @doc
 * @doc-name rich-text-editor
 * @doc-is-main
 * @doc-description Accessible rich-text editor wrapping Lexical with a formatting toolbar.
 * @doc-example Default
 *   A full editor with the formatting toolbar and a placeholder.
 *   @doc-file rich-text-editor.example.ts
 * @doc-example Readonly
 *   Renders existing content without editing affordances.
 *   @doc-file rich-text-editor.readonly.example.ts
 * @doc-aria role="textbox" — the editable surface, with aria-multiline="true".
 * @doc-aria role="toolbar" — the formatting controls, arrow-key navigable.
 * @doc-a11y Toolbar buttons expose aria-pressed; changes are announced via an aria-live region.
 * @doc-css-var --kj-rte-bg — Editor background.
 * @doc-css-var --kj-rte-border-color — Border colour.
 * @doc-css-var --kj-rte-radius — Corner radius.
 * @doc-css-var --kj-rte-min-height — Minimum height of the editable area.
 * @doc-related input,form,field
 */
@Component({
  selector: 'kj-rich-text-editor',
  standalone: true,
  imports: [
    KjRichTextEditor,
    KjRovingTabindex,
    KjRovingTabindexItemDirective,
    KjLiveRegion,
    KjIconDirective,
  ],
  host: { class: 'kj-rte' },
  template: `
    @if (kjShowToolbar()) {
      <div
        class="kj-rte__toolbar"
        role="toolbar"
        [attr.aria-label]="kjToolbarLabel()"
        [attr.aria-controls]="contentId"
        kjRovingTabindex
        kjRovingOrientation="horizontal"
      >
        <div class="kj-rte__group" role="group" aria-label="Text formatting">
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Bold"
            title="Bold (Ctrl+B)"
            [class.kj-rte__btn--active]="ed.isBold()"
            [attr.aria-pressed]="ed.isBold()"
            (mousedown)="$event.preventDefault()"
            (click)="onFormat(ed, 'bold', 'Bold')"
          >
            <i kjIcon="bold" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Italic"
            title="Italic (Ctrl+I)"
            [class.kj-rte__btn--active]="ed.isItalic()"
            [attr.aria-pressed]="ed.isItalic()"
            (mousedown)="$event.preventDefault()"
            (click)="onFormat(ed, 'italic', 'Italic')"
          >
            <i kjIcon="italic" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Underline"
            title="Underline (Ctrl+U)"
            [class.kj-rte__btn--active]="ed.isUnderline()"
            [attr.aria-pressed]="ed.isUnderline()"
            (mousedown)="$event.preventDefault()"
            (click)="onFormat(ed, 'underline', 'Underline')"
          >
            <i kjIcon="underline" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Strikethrough"
            title="Strikethrough"
            [class.kj-rte__btn--active]="ed.isStrikethrough()"
            [attr.aria-pressed]="ed.isStrikethrough()"
            (mousedown)="$event.preventDefault()"
            (click)="onFormat(ed, 'strikethrough', 'Strikethrough')"
          >
            <i kjIcon="strikethrough" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Inline code"
            title="Inline code"
            [class.kj-rte__btn--active]="ed.isCode()"
            [attr.aria-pressed]="ed.isCode()"
            (mousedown)="$event.preventDefault()"
            (click)="onFormat(ed, 'code', 'Inline code')"
          >
            <i kjIcon="code" aria-hidden="true"></i>
          </button>
        </div>

        <span class="kj-rte__sep" role="separator" aria-orientation="vertical"></span>

        <div class="kj-rte__group" role="group" aria-label="Headings">
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Heading 1"
            title="Heading 1"
            [class.kj-rte__btn--active]="ed.blockType() === 'h1'"
            [attr.aria-pressed]="ed.blockType() === 'h1'"
            (mousedown)="$event.preventDefault()"
            (click)="onBlock(ed, 'h1', 'Heading 1')"
          >
            <i kjIcon="heading-1" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Heading 2"
            title="Heading 2"
            [class.kj-rte__btn--active]="ed.blockType() === 'h2'"
            [attr.aria-pressed]="ed.blockType() === 'h2'"
            (mousedown)="$event.preventDefault()"
            (click)="onBlock(ed, 'h2', 'Heading 2')"
          >
            <i kjIcon="heading-2" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Heading 3"
            title="Heading 3"
            [class.kj-rte__btn--active]="ed.blockType() === 'h3'"
            [attr.aria-pressed]="ed.blockType() === 'h3'"
            (mousedown)="$event.preventDefault()"
            (click)="onBlock(ed, 'h3', 'Heading 3')"
          >
            <i kjIcon="heading-3" aria-hidden="true"></i>
          </button>
        </div>

        <span class="kj-rte__sep" role="separator" aria-orientation="vertical"></span>

        <div class="kj-rte__group" role="group" aria-label="Blocks">
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Bullet list"
            title="Bullet list"
            [class.kj-rte__btn--active]="ed.blockType() === 'bullet'"
            [attr.aria-pressed]="ed.blockType() === 'bullet'"
            (mousedown)="$event.preventDefault()"
            (click)="onList(ed, 'bullet', 'Bullet list')"
          >
            <i kjIcon="list" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Numbered list"
            title="Numbered list"
            [class.kj-rte__btn--active]="ed.blockType() === 'number'"
            [attr.aria-pressed]="ed.blockType() === 'number'"
            (mousedown)="$event.preventDefault()"
            (click)="onList(ed, 'number', 'Numbered list')"
          >
            <i kjIcon="list-ordered" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Quote"
            title="Quote"
            [class.kj-rte__btn--active]="ed.blockType() === 'quote'"
            [attr.aria-pressed]="ed.blockType() === 'quote'"
            (mousedown)="$event.preventDefault()"
            (click)="onBlock(ed, 'quote', 'Quote')"
          >
            <i kjIcon="quote" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Code block"
            title="Code block"
            [class.kj-rte__btn--active]="ed.blockType() === 'code'"
            [attr.aria-pressed]="ed.blockType() === 'code'"
            (mousedown)="$event.preventDefault()"
            (click)="onBlock(ed, 'code', 'Code block')"
          >
            <i kjIcon="square-code" aria-hidden="true"></i>
          </button>
        </div>

        <span class="kj-rte__sep" role="separator" aria-orientation="vertical"></span>

        <div class="kj-rte__group" role="group" aria-label="Insert">
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Link"
            title="Link (Ctrl+K)"
            [class.kj-rte__btn--active]="ed.isLink()"
            [attr.aria-pressed]="ed.isLink()"
            [attr.aria-expanded]="linkOpen()"
            (mousedown)="$event.preventDefault()"
            (click)="onLink(ed)"
          >
            <i kjIcon="link" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Image"
            title="Insert image"
            [attr.aria-expanded]="imageOpen()"
            (mousedown)="$event.preventDefault()"
            (click)="onImage()"
          >
            <i kjIcon="image" aria-hidden="true"></i>
          </button>
        </div>

        <span class="kj-rte__sep" role="separator" aria-orientation="vertical"></span>

        <div class="kj-rte__group" role="group" aria-label="History">
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            [disabled]="!ed.canUndo()"
            (mousedown)="$event.preventDefault()"
            (click)="onUndo(ed)"
          >
            <i kjIcon="undo" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="kj-rte__btn"
            kjRovingTabindexItem
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            [disabled]="!ed.canRedo()"
            (mousedown)="$event.preventDefault()"
            (click)="onRedo(ed)"
          >
            <i kjIcon="redo" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      @if (linkOpen()) {
        <form class="kj-rte__inline" (submit)="applyLink(ed, $event)">
          <label class="kj-rte__inline-label" [attr.for]="contentId + '-link'">URL</label>
          <input
            #linkInput
            class="kj-rte__inline-input"
            type="url"
            [id]="contentId + '-link'"
            [value]="linkUrl()"
            placeholder="https://example.com"
            (input)="linkUrl.set($any($event.target).value)"
            (keydown.escape)="closeLink(ed)"
          />
          <button type="submit" class="kj-rte__inline-btn">Apply</button>
          <button type="button" class="kj-rte__inline-btn" (click)="removeLink(ed)">Remove</button>
          <button type="button" class="kj-rte__inline-btn" (click)="closeLink(ed)">Cancel</button>
        </form>
      }

      @if (imageOpen()) {
        <form class="kj-rte__inline" (submit)="applyImage(ed, $event)">
          <label class="kj-rte__inline-label" [attr.for]="contentId + '-img'">Image URL</label>
          <input
            #imageInput
            class="kj-rte__inline-input"
            type="url"
            [id]="contentId + '-img'"
            [value]="imageSrc()"
            placeholder="https://example.com/photo.jpg"
            (input)="imageSrc.set($any($event.target).value)"
            (keydown.escape)="closeImage(ed)"
          />
          <input
            class="kj-rte__inline-input"
            type="text"
            [value]="imageAlt()"
            placeholder="Alt text"
            aria-label="Image alternative text"
            (input)="imageAlt.set($any($event.target).value)"
            (keydown.escape)="closeImage(ed)"
          />
          <button type="submit" class="kj-rte__inline-btn">Insert</button>
          <button type="button" class="kj-rte__inline-btn" (click)="closeImage(ed)">Cancel</button>
        </form>
      }
    }

    <div
      #ed="kjRichTextEditor"
      [id]="contentId"
      class="kj-rte__content"
      kjRichTextEditor
      [kjValue]="kjValue()"
      [kjReadonly]="kjReadonly()"
      [attr.aria-label]="kjLabelledBy() ? null : kjLabel()"
      [attr.aria-labelledby]="kjLabelledBy() || null"
      [attr.data-placeholder]="kjPlaceholder() || null"
      (valueChange)="valueChange.emit($event)"
      (textChange)="textChange.emit($event)"
      (jsonChange)="jsonChange.emit($event)"
    ></div>

    <div class="kj-rte__sr" kjLiveRegion aria-live="polite"></div>
  `,
  styleUrl: './rich-text-editor.css',
  // Editor content is rendered by Lexical (outside Angular), so it cannot carry
  // emulated-encapsulation scoping attributes. Styles are namespaced under
  // `.kj-rte` to stay contained. (Same rationale as the chart component.)
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjRichTextEditorComponent {
  /** Initial HTML content. */
  readonly kjValue = input<string>('');
  /** Accessible label for the editable region (ignored when `kjLabelledBy` is set). */
  readonly kjLabel = input<string>('Rich text editor');
  /** ID of an external element that labels the editable region. */
  readonly kjLabelledBy = input<string>('');
  /** Placeholder shown while the editor is empty. */
  readonly kjPlaceholder = input<string>('');
  /** Render read-only (non-editable) content. */
  readonly kjReadonly = input<boolean>(false);
  /** Accessible label for the toolbar. */
  readonly kjToolbarLabel = input<string>('Formatting');
  /** Whether the formatting toolbar is shown. */
  readonly kjShowToolbar = input<boolean>(true);

  /** Emits the serialized HTML whenever the content changes. */
  readonly valueChange = output<string>();
  /** Emits the plain text whenever the content changes. */
  readonly textChange = output<string>();
  /** Emits the Lexical serialized state whenever the content changes. */
  readonly jsonChange = output<unknown>();

  /** @internal Stable id used for aria-controls / labelledby wiring. */
  protected readonly contentId = `kj-rte-${kjRteUid++}`;

  private readonly live = viewChild(KjLiveRegion);
  private readonly linkInput = viewChild<ElementRef<HTMLInputElement>>('linkInput');
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');

  protected readonly linkOpen = signal(false);
  protected readonly linkUrl = signal('');
  protected readonly imageOpen = signal(false);
  protected readonly imageSrc = signal('');
  protected readonly imageAlt = signal('');

  private announce(message: string): void {
    this.live()?.announce(message);
  }

  protected onFormat(ed: KjRichTextEditor, format: KjTextFormat, label: string): void {
    ed.toggleFormat(format);
    this.announce(`${label} ${ed.state().activeFormats.has(format) ? 'on' : 'off'}`);
    ed.focus();
  }

  protected onBlock(
    ed: KjRichTextEditor,
    block: Exclude<KjBlockType, 'bullet' | 'number'>,
    label: string,
  ): void {
    if (ed.blockType() === block) {
      ed.setBlock('paragraph');
      this.announce('Paragraph');
    } else {
      ed.setBlock(block);
      this.announce(label);
    }
    ed.focus();
  }

  protected onList(ed: KjRichTextEditor, type: 'bullet' | 'number', label: string): void {
    ed.toggleList(type);
    this.announce(ed.blockType() === type ? label : 'List removed');
    ed.focus();
  }

  protected onUndo(ed: KjRichTextEditor): void {
    ed.undo();
    this.announce('Undo');
    ed.focus();
  }

  protected onRedo(ed: KjRichTextEditor): void {
    ed.redo();
    this.announce('Redo');
    ed.focus();
  }

  protected onLink(ed: KjRichTextEditor): void {
    this.closeImage(ed);
    this.linkUrl.set(ed.getSelectedLinkUrl() ?? '');
    this.linkOpen.set(true);
    queueMicrotask(() => this.linkInput()?.nativeElement.focus());
  }

  protected applyLink(ed: KjRichTextEditor, event: Event): void {
    event.preventDefault();
    const url = this.linkUrl().trim();
    ed.toggleLink(url || null);
    this.announce(url ? 'Link added' : 'Link removed');
    this.linkOpen.set(false);
    ed.focus();
  }

  protected removeLink(ed: KjRichTextEditor): void {
    ed.toggleLink(null);
    this.announce('Link removed');
    this.linkOpen.set(false);
    ed.focus();
  }

  protected closeLink(ed: KjRichTextEditor): void {
    this.linkOpen.set(false);
    ed.focus();
  }

  protected onImage(): void {
    this.linkOpen.set(false);
    this.imageSrc.set('');
    this.imageAlt.set('');
    this.imageOpen.set(true);
    queueMicrotask(() => this.imageInput()?.nativeElement.focus());
  }

  protected applyImage(ed: KjRichTextEditor, event: Event): void {
    event.preventDefault();
    const src = this.imageSrc().trim();
    if (src) {
      ed.insertImage({ src, alt: this.imageAlt().trim() });
      this.announce('Image inserted');
    }
    this.imageOpen.set(false);
    ed.focus();
  }

  protected closeImage(ed: KjRichTextEditor): void {
    this.imageOpen.set(false);
    ed.focus();
  }
}
