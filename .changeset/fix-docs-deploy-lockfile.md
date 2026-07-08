---
"@kouji-ui/components": patch
---

Fix broken Vercel docs deploy after the `KjRichTextEditor` merge (#24).

The nine `@lexical/*` (and `lexical`) **optional peer dependencies** added to
`@kouji-ui/components` were never recorded in `pnpm-lock.yaml`, so Vercel's
`pnpm install --frozen-lockfile` aborted before the build could run — taking the
whole docs site (not just the rich-text editor page) offline. Regenerated the
lockfile so the frozen install resolves and the static prerender completes,
restoring the RTE documentation route.
