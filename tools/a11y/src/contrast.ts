import { parseArgs } from 'node:util';
import {
  evaluate,
  rgbToHex,
  parseColor,
  suggestFgs,
  type ContrastVerdict,
} from './contrast-utils.js';

function fmtRow(label: string, pass: boolean): string {
  return `${label.padEnd(22)} ${pass ? 'PASS' : 'FAIL'}`;
}

function printVerdict(fg: string, bg: string, v: ContrastVerdict): void {
  console.log(`fg: ${fg}  (${rgbToHex(parseColor(fg))})`);
  console.log(`bg: ${bg}  (${rgbToHex(parseColor(bg))})`);
  console.log(`ratio: ${v.ratio.toFixed(2)}:1\n`);
  console.log(fmtRow('AA  normal (4.5:1)',  v.aa.normal));
  console.log(fmtRow('AA  large  (3:1)',    v.aa.large));
  console.log(fmtRow('AAA normal (7:1)',    v.aaa.normal));
  console.log(fmtRow('AAA large  (4.5:1)',  v.aaa.large));
}

function runCheck(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { target: { type: 'string' } },
    allowPositionals: true,
  });
  if (positionals.length !== 2) {
    console.error('usage: pnpm a11y contrast <fg> <bg> [--target <ratio>]');
    return 2;
  }
  const [fg, bg] = positionals as [string, string];
  const v = evaluate(fg, bg);
  printVerdict(fg, bg, v);

  if (values.target !== undefined) {
    const target = Number(values.target);
    if (!Number.isFinite(target) || target <= 1) {
      console.error(`invalid --target '${values.target}'`);
      return 2;
    }
    const meets = v.ratio >= target;
    console.log(`\ntarget ${target}:1 ${meets ? 'PASS' : 'FAIL'} (have ${v.ratio.toFixed(2)}:1)`);
    if (!meets) return 1;
  }

  return v.aa.normal ? 0 : 1;
}

function runSuggest(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { target: { type: 'string' } },
    allowPositionals: true,
  });
  if (positionals.length !== 1) {
    console.error('usage: pnpm a11y contrast suggest <bg> [--target <ratio>]');
    return 2;
  }
  const [bg] = positionals as [string];
  const target = values.target !== undefined ? Number(values.target) : 4.5;
  if (!Number.isFinite(target) || target <= 1) {
    console.error(`invalid --target '${values.target}'`);
    return 2;
  }

  const suggestions = suggestFgs(bg, target);
  console.log(`bg: ${bg}  (${rgbToHex(parseColor(bg))})`);
  console.log(`target: ${target}:1\n`);
  console.log(`candidate     hex      ratio   ${target}:1`);
  console.log('─────────────────────────────────────────');
  for (const s of suggestions) {
    const verdict = s.meetsTarget ? 'PASS' : 'FAIL';
    console.log(
      `${s.name.padEnd(12)}  ${s.hex}  ${s.ratio.toFixed(2).padStart(5)}   ${verdict}`,
    );
  }
  const passing = suggestions.filter(s => s.meetsTarget);
  return passing.length > 0 ? 0 : 1;
}

export function runContrastCli(argv: string[]): number {
  if (argv[0] === 'suggest') return runSuggest(argv.slice(1));
  return runCheck(argv);
}
