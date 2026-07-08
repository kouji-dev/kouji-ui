import type { PlaygroundFile } from '../playground-types';
import { BUCKET_A_FILES } from './bucket-a';
import { BUCKET_B_FILES } from './bucket-b';
import { BUCKET_C_FILES } from './bucket-c';
import { BUCKET_D_FILES } from './bucket-d';
import { BUCKET_E_FILES } from './bucket-e';
import { BUCKET_F_FILES } from './bucket-f';

/**
 * Aggregated playground registry. Keys are `DocItem.symbol`. Components
 * migrated to the new `PlaygroundFile` shape are looked up here first; the
 * older `PLAYGROUND_REGISTRY` (controls / demo modes) is the fallback for
 * symbols not yet migrated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PLAYGROUND_FILES: Record<string, PlaygroundFile> = {
  ...BUCKET_A_FILES,
  ...BUCKET_B_FILES,
  ...BUCKET_C_FILES,
  ...BUCKET_D_FILES,
  ...BUCKET_E_FILES,
  ...BUCKET_F_FILES,
};
