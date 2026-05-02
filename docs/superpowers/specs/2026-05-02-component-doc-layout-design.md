# Component Doc Page Layout — Design Spec

**Date:** 2026-05-02
**Scope:** `apps/docs/src/app/pages/component-doc/` — template, CSS, and TOC wiring only. No changes to data model or extractor.

---

## Goal

Restructure the component documentation page into two clear top-level sections: **Definitions** (all directive/service/token API reference) and **Examples** (all live `@doc-file` examples). The right-side TOC reflects both sections with nested anchors.

---

## New Page Structure

```
Page Header
  ├── category badge
  ├── h1 component name
  └── description

Definitions                          ← h2, TOC anchor: "Definitions"
  └── per directive/service/token:
        [selector]  ClassName        ← TOC anchor: ClassName
        description
        Inputs table (DocsTable)
        @example block (if any)      ← static code only, from directive.examples[]

Examples                             ← h2, TOC anchor: "Examples" (only if docExamples exist)
  └── per docExample:
        ○ Label                      ← TOC anchor: Label
        [DEFAULT] [RETRO] [FINANCE]  Show code
        live preview (KjCodePreview)
```

---

## Right TOC Entries

The `kjPageToc` directive scans `[data-toc-entry]` elements. New entries added:

| Element | `data-toc-entry` | `data-toc-level` |
|---|---|---|
| `<section class="definitions-section">` | `"Definitions"` | `2` |
| Each directive `<section>` | `directive.className` | `3` |
| `<section class="examples-section">` | `"Examples"` | `2` |
| Each docExample `<div>` | `docEx.label` | `3` |

---

## Template Changes — `component-doc.html`

### Before (current structure):
```html
<!-- flat list of directive sections, each with inputs + examples mixed -->
@for (directive of comp.directives) {
  <section data-toc-entry="...">
    inputs table
    examples
  </section>
}
```

### After (new structure):
```html
<!-- Page header — unchanged -->
<header class="doc-header">...</header>

<!-- Definitions section -->
<section class="definitions-section"
         id="definitions"
         data-toc-entry="Definitions"
         data-toc-level="2">
  <h2 class="section-title">Definitions</h2>

  @for (directive of comp.directives; track directive.className) {
    <section class="directive-section"
             [id]="directive.className"
             [attr.data-toc-entry]="directive.className"
             data-toc-level="3">
      <!-- selector + class name header — unchanged -->
      <div class="directive-header">...</div>
      <!-- description — unchanged -->
      <!-- inputs table (DocsTable) — unchanged -->
      <!-- @example TSDoc blocks — NEW: rendered as static code -->
      @if (directive.examples.length) {
        <div class="inline-examples">
          @for (ex of directive.examples; track $index) {
            <kj-code-editor [code]="ex"
              [lang]="ex.trimStart().startsWith('<') ? 'html' : 'ts'" />
          }
        </div>
      }
    </section>
  }
</section>

<!-- Examples section — only when docExamples exist -->
@if (hasDocExamples()) {
  <section class="examples-section"
           id="examples"
           data-toc-entry="Examples"
           data-toc-level="2">
    <h2 class="section-title">Examples</h2>

    @for (directive of comp.directives; track directive.className) {
      @for (docEx of directive.docExamples; track docEx.label; let i = $index) {
        <div class="example-section"
             [id]="directive.className + '-ex-' + i"
             [attr.data-toc-entry]="docEx.label"
             data-toc-level="3">
          <div class="example-label">{{ docEx.label }}</div>
          <kj-code-preview [docExamples]="[docEx]" [componentName]="comp.name" />
        </div>
      }
    }
  </section>
}
```

`hasDocExamples()` is a computed signal on `ComponentDocComponent` that returns true when any directive has `docExamples.length > 0`.

---

## CSS Changes — `component-doc.css`

Add `.definitions-section` and `.examples-section` as section containers with a top `h2`:

```css
.definitions-section,
.examples-section {
  padding-top: 2rem;
  border-top: 1px solid var(--border);
  margin-top: 2rem;
}

.section-title {
  font-family: 'Syne', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2rem;
  letter-spacing: -0.02em;
}
```

The `scroll-margin-top` on `.directive-section` already handles the mobile fixed header offset.

---

## `component-doc.ts` Changes

Add one computed signal:

```typescript
protected readonly hasDocExamples = computed(() =>
  (this.component()?.directives ?? []).some(d => d.docExamples.length > 0)
);
```

---

## Files Touched

| File | Change |
|---|---|
| `apps/docs/src/app/pages/component-doc/component-doc.html` | Restructure into Definitions + Examples sections |
| `apps/docs/src/app/pages/component-doc/component-doc.css` | Add `.section-title`, `.definitions-section`, `.examples-section` |
| `apps/docs/src/app/pages/component-doc/component-doc.ts` | Add `hasDocExamples` computed signal |

No changes to extractor, data model, or other components.
