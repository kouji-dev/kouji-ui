import { z } from 'zod';

const COLOR_SLOTS = [
  'base-100','primary','secondary','accent','neutral','info','success','warning','destructive',
] as const;

const CONTENT_SLOTS = [
  'base-content',
  'primary-content','secondary-content','accent-content','neutral-content',
  'info-content','success-content','warning-content','destructive-content',
] as const;

const colorsObj = z.object(
  Object.fromEntries(COLOR_SLOTS.map(s => [s, z.string()])) as Record<typeof COLOR_SLOTS[number], z.ZodString>,
);

const contentsObj = z.object(
  Object.fromEntries(CONTENT_SLOTS.map(s => [s, z.string().optional()])) as Record<typeof CONTENT_SLOTS[number], z.ZodOptional<z.ZodString>>,
);

export const DraftThemeSchema = z.object({
  name: z.string().max(32),
  colors: colorsObj,
  contentOverrides: contentsObj.optional().default({}),
  shape: z.object({
    radiusBox: z.number(),
    radiusField: z.number(),
    radiusSelector: z.number(),
    border: z.number(),
    depth: z.number(),
  }),
  type:   z.object({ fontSans: z.string(), fontMono: z.string(), fontDisplay: z.string() }),
  motion: z.object({ transition: z.string() }),
});

export type ParsedDraft = z.infer<typeof DraftThemeSchema>;
