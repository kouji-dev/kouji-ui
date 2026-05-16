---
title: Form schema engine
description: Generate a full kj form from a TypeScript schema. JSON-schema interop for backend reuse.
version: v0.3+
date: Q4 2026
category: component
status: idea
candidate: true
issues: 6
prs: 0
candor: Not committed. Need to validate the API against 3+ real apps first.
---

Define a schema in TS, get a fully-validated form with the right kj components per field type. Inspired by Formly but tighter integration with our typed inputs (so a `z.number()` becomes `<kj-number-input>` and not a hint to compose one manually). Open question: does it belong in `@kouji-ui/core` or a separate `@kouji-ui/forms` package?
