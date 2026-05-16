---
title: AI-friendly component metadata
description: Per-component JSON schemas describing props, slots, events — for LLM tool use and IDE assistants.
version: "?"
date: "?"
category: docs
status: idea
candor: Speculative. Waiting for the dust to settle on agent-tool standards before locking a shape.
---

The docs extractor already builds a typed manifest of every component (`docs-extractor.types.ts`). Publishing that manifest as a stable JSON schema would let LLM coding agents discover and compose kj components correctly — no more hallucinated prop names. Companion: a `mcp` server that surfaces the manifest as tool calls.
