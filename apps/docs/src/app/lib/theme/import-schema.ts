import { z } from 'zod';
import { BG_SLOTS, FG_SLOTS } from './types';

const bgObj = z.object(
  Object.fromEntries(BG_SLOTS.map(s => [s, z.string()])) as Record<typeof BG_SLOTS[number], z.ZodString>,
);

const fgObj = z.object(
  Object.fromEntries(FG_SLOTS.map(s => [s, z.string()])) as Record<typeof FG_SLOTS[number], z.ZodString>,
);

const typographyObj = z.object({
  bodyRem:  z.number().positive().default(1),
  smallRem: z.number().positive().default(0.875),
});

export const DraftThemeSchema = z.object({
  name: z.string().max(32),
  bg: bgObj,
  fg: fgObj,
  shape: z.object({
    radiusBox: z.number(),
    radiusField: z.number(),
    radiusSelector: z.number(),
    border: z.number(),
    depth: z.number(),
  }),
  type:       z.object({ fontSans: z.string(), fontMono: z.string(), fontDisplay: z.string() }),
  typography: typographyObj.optional().default({ bodyRem: 1, smallRem: 0.875 }),
  motion:     z.object({ transition: z.string() }),
});

export type ParsedDraft = z.infer<typeof DraftThemeSchema>;
