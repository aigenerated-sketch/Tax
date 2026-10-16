// Generates docs/RULES_VERIFICATION.md from src/rules/verification.ts. Run: npm run docs:rules
import { writeFileSync } from 'node:fs';
import { SOURCES, TAX_YEARS, UNCERTAINTIES_2026_27, VERIFICATION_2026_27 } from '../src/rules';

const r = TAX_YEARS['2026-27'];
const label = { official: 'Official', 'official-inferred': 'Official (inferred)', secondary: 'Secondary only', convention: 'Convention' };
const esc = (s: string) => s.replace(/\|/g, '\\|');
const lines: string[] = [
  `# Rules verification register — ${r.label}`,
  '',
  `Generated from \`src/rules/verification.ts\` (values are read from the live rule configuration). Sources checked on ${r.dateVerified}.`,
  '',
  '**Status:** *Official* = stated on the cited GOV.UK / gov.scot / HMRC manual page. *Official (inferred)* = follows directly from official statements but not stated in those words. *Secondary only* = supported only by non-government sources. *Convention* = modelling choice where the rule is silent or ambiguous.',
  '',
  `Summary: ${(['official', 'official-inferred', 'secondary', 'convention'] as const).map((l) => `${VERIFICATION_2026_27.filter((v) => v.level === l).length} ${label[l].toLowerCase()}`).join(', ')}.`,
  '',
  '| Area | Rule | Value | Status | Sources | Note |',
  '|---|---|---|---|---|---|',
  ...VERIFICATION_2026_27.map(
    (v) => `| ${esc(v.area)} | ${esc(v.rule)} | ${esc(v.value)} | ${label[v.level]} | ${v.sources.map((u, i) => `[${i + 1}](${u})`).join(' ') || '—'} | ${esc(v.note ?? '')} |`,
  ),
  '',
  '## Uncertain, assumed or not yet verified',
  '',
  ...UNCERTAINTIES_2026_27.flatMap((u) => [`**${u.id}. ${u.title}.** ${u.detail} *Handling:* ${u.handling}`, '']),
  '## Source register',
  '',
  ...Object.values(SOURCES).map((s) => `- [${s.title}](${s.url})`),
  '',
];
writeFileSync(new URL('../docs/RULES_VERIFICATION.md', import.meta.url), lines.join('\n'));
console.log(`wrote ${VERIFICATION_2026_27.length} rules`);
