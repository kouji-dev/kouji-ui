---
'@kouji-ui/core': patch
---

fix(rich-text-editor): make the editable surface actually editable

The Lexical build in use does not set `contenteditable` on its root element —
it only listens on an element that is already editable. `KjRichTextEditor` never
set it, so the editor attached (`data-lexical-editor`) but the surface couldn't
be clicked into or typed in. The directive now binds
`contenteditable` on its host (`false` when readonly/disabled, `true`
otherwise), so clicking in and typing works.
