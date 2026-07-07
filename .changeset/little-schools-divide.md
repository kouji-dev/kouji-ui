---
---

docs site only (no package release): fix the roadmap board rendering empty when
reached via client-side navigation on the static Vercel deploy. RoadmapService
now seeds its items into TransferState on every prerendered route, so the board
fills regardless of entry page.
