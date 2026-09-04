#!/usr/bin/env node
// Boring repository validator.
//
// Checks YAML syntax, JSON schemas, ID formats and uniqueness, source and
// cross references, README/spec consistency, and internal Markdown links.
// This is a repository maintenance tool, not the Boring product.
//
//   node scripts/validate.mjs                    # structural validation
//   node scripts/validate.mjs --external-links   # additionally probe https:// links (warn-only)

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Ajv from 'ajv/dist/2020.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkExternal = process.argv.includes('--external-links');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const rel = (p) => relative(root, p).split('\\').join('/');
const evidenceSupports = new Set(['direct', 'derived', 'contextual']);

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function walk(dir, pred, acc = []) {
  let names;
  try { names = readdirSync(dir); } catch { return acc; }
  for (const name of names) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, pred, acc);
    else if (pred(name, p)) acc.push(p);
  }
  return acc;
}

function loadYaml(path) {
  try {
    const document = yaml.load(readFileSync(path, 'utf8'));
    if (document === undefined || document === null) {
      err(`${rel(path)}: YAML document is empty`);
      return undefined;
    }
    return document;
  } catch (e) {
    err(`YAML parse error in ${rel(path)}: ${e.message}`);
    return undefined;
  }
}

const ajv = new Ajv({ strict: false, allErrors: true });
const schemaCache = new Map();
function validateSchema(instance, schemaFile, label) {
  let fn = schemaCache.get(schemaFile);
  if (!fn) {
    const schema = JSON.parse(readFileSync(join(root, 'schemas', schemaFile), 'utf8'));
    fn = ajv.compile(schema);
    schemaCache.set(schemaFile, fn);
  }
  if (!fn(instance)) {
    const shown = fn.errors.slice(0, 5);
    for (const e of shown) err(`${label}: schema: ${e.instancePath || '/'} ${e.message}`);
    if (fn.errors.length > shown.length) err(`${label}: schema: ...and ${fn.errors.length - shown.length} more errors`);
    return false;
  }
  return true;
}

function validateEvidence(entries, label, listedSources, kind) {
  if (!Array.isArray(entries) || entries.length === 0) {
    err(`${label}: ${kind} has no evidence entries`);
    return;
  }
  const seen = new Set();
  for (const evidence of entries) {
    if (!evidence || typeof evidence !== 'object') continue;
    if (seen.has(evidence.source)) err(`${label}: duplicate evidence source ${evidence.source}`);
    seen.add(evidence.source);
    if (!listedSources.includes(evidence.source)) {
      err(`${label}: evidence source ${evidence.source} is not present in sources`);
    }
    if (!sourceIds.has(evidence.source)) {
      err(`${label}: evidence references unknown source ${evidence.source}`);
    }
    if (!evidenceSupports.has(evidence.support)) {
      err(`${label}: evidence for ${evidence.source} has invalid support type ${evidence.support}`);
    }
    if (typeof evidence.locator !== 'string' || !evidence.locator.trim()) {
      err(`${label}: evidence for ${evidence.source} needs a non-empty locator`);
    }
    if (typeof evidence.note !== 'string' || !evidence.note.trim()) {
      err(`${label}: evidence for ${evidence.source} needs a non-empty note`);
    }
  }
  if ((kind === 'MUST' || kind === 'SHOULD')
      && !entries.some((e) => e && (e.support === 'direct' || e.support === 'derived'))) {
    err(`${label}: ${kind} content needs direct or derived evidence; contextual evidence cannot establish a normative level`);
  }
}

// --- source registry -----------------------------------------------------------

const registryPath = join(root, 'sources', 'registry.yaml');
const registry = loadYaml(registryPath);
const sourceIds = new Map();
if (registry !== undefined && validateSchema(registry, 'source.schema.json', rel(registryPath))) {
  for (const s of registry) {
    if (sourceIds.has(s.id)) err(`duplicate source id ${s.id} (${rel(registryPath)})`);
    sourceIds.set(s.id, s);
    if (!isValidDate(s.accessed)) err(`${rel(registryPath)}: source ${s.id} has invalid accessed date ${s.accessed}`);
  }
}

// --- specs ---------------------------------------------------------------------

const specFiles = walk(join(root, 'specs'), (n) => n === 'spec.yaml');
const rules = new Map(); // ruleId -> { file, specId }
const specRecords = [];

for (const file of specFiles) {
  const label = rel(file);
  const doc = loadYaml(file);
  if (!doc) continue;
  if (!validateSchema(doc, 'spec.schema.json', label)) continue;
  const spec = doc.spec;
  const dirName = dirname(file).split('\\').pop().split('/').pop();
  if (spec.id !== dirName) err(`${label}: spec.id "${spec.id}" does not match directory "${dirName}"`);
  if (!isValidDate(spec.updated)) err(`${label}: spec.updated is not a real calendar date: ${spec.updated}`);

  const readme = join(dirname(file), 'README.md');
  if (!existsSync(readme)) {
    err(`${label}: missing sibling README.md`);
  } else {
    const md = readFileSync(readme, 'utf8');
    for (const r of spec.rules) {
      const tableEntry = `| [${r.id}](#${r.id.toLowerCase()}) | ${r.level} | ${r.title} |`;
      const detailHeading = `### ${r.id} — ${r.title} (${r.level})`;
      if (!md.includes(tableEntry)) {
        err(`${label}: rule ${r.id} is missing or out of sync in the rules table of ${rel(readme)}`);
      }
      if (!md.includes(detailHeading)) {
        err(`${label}: rule ${r.id} is missing or out of sync in the detail headings of ${rel(readme)}`);
      }
    }
  }

  specRecords.push({ spec, file });
  for (const r of spec.rules) {
    if (rules.has(r.id)) err(`duplicate rule id ${r.id} (also in ${rel(rules.get(r.id).file)})`);
    rules.set(r.id, { file, specId: spec.id });
    if (!r.sources.length) err(`${label}: rule ${r.id} has no source (every rule needs tier 1–5 provenance)`);
    for (const s of r.sources) {
      if (!sourceIds.has(s)) err(`${label}: rule ${r.id} references unknown source ${s}`);
      else if (sourceIds.get(s).tier > 5) err(`${label}: rule ${r.id} uses tier ${sourceIds.get(s).tier} source ${s}; content requires tier 1–5 provenance`);
    }
    validateEvidence(r.evidence, `${label}: rule ${r.id}`, r.sources, r.level);
    if (r.superseded_by && r.superseded_by === r.id) err(`${label}: rule ${r.id} cannot supersede itself`);
    for (const e of r.edge_cases || []) { /* checked after edge loading */ }
    for (const x of r.related_rules || []) { /* checked after all rules loaded */ }
    if ((r.level === 'MUST' || r.level === 'SHOULD') && (r.sources || []).length === 0) {
      err(`${label}: rule ${r.id} is ${r.level} but has no sources (see docs/methodology.md)`);
    }
  }
}

// --- edge-case datasets --------------------------------------------------------

const edgeFiles = walk(join(root, 'edge-cases'), (n) => n.endsWith('.yaml') || n.endsWith('.yml'));
const edgeCases = new Map();

for (const file of edgeFiles) {
  const label = rel(file);
  const doc = loadYaml(file);
  if (!doc) continue;
  if (!validateSchema(doc, 'edge-case.schema.json', label)) continue;
  if (!isValidDate(doc.dataset.updated)) err(`${label}: dataset.updated is not a real calendar date: ${doc.dataset.updated}`);
  for (const c of doc.cases) {
    if (edgeCases.has(c.id)) err(`duplicate edge-case id ${c.id} (also in ${rel(edgeCases.get(c.id))})`);
    edgeCases.set(c.id, file);
    if (!c.sources.length) err(`${label}: case ${c.id} has no source (every edge case needs tier 1–5 provenance)`);
    for (const s of c.sources) {
      if (!sourceIds.has(s)) err(`${label}: case ${c.id} references unknown source ${s}`);
      else if (sourceIds.get(s).tier > 5) err(`${label}: case ${c.id} uses tier ${sourceIds.get(s).tier} source ${s}; content requires tier 1–5 provenance`);
    }
    validateEvidence(c.evidence, `${label}: case ${c.id}`, c.sources, 'edge case');
  }
}

// --- cross references ----------------------------------------------------------

for (const { spec, file } of specRecords) {
  const label = rel(file);
  for (const r of spec.rules) {
    for (const e of r.edge_cases || []) {
      if (!edgeCases.has(e)) err(`${label}: rule ${r.id} references unknown edge case ${e}`);
    }
    for (const x of r.related_rules || []) {
      if (!rules.has(x)) err(`${label}: rule ${r.id} references unknown rule ${x}`);
    }
  }
}
for (const [caseId, file] of edgeCases) {
  const doc = loadYaml(file); // cached parse cost is fine at this size
  const c = doc.cases.find((c) => c.id === caseId);
  for (const x of c.related_rules || []) {
    if (!rules.has(x)) err(`${rel(file)}: case ${caseId} references unknown rule ${x}`);
  }
}

// Markdown examples are part of the public navigation surface. A stale rule or
// edge-case ID in prose is a broken example even when every YAML file validates.
const allIds = new Set([...rules.keys(), ...edgeCases.keys()]);
const boringIdRe = /BORING-(?:EDGE-)?[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}/g;

// --- internal markdown links ---------------------------------------------------

const mdFiles = [...new Set([
  ...walk(root, (n) => n.endsWith('.md')),
  ...walk(root, (n) => n === 'PULL_REQUEST_TEMPLATE.md'),
])];
const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(boringIdRe)) {
    if (!allIds.has(match[0])) err(`${rel(file)}: documentation references unknown ID ${match[0]}`);
  }
  for (const m of text.matchAll(linkRe)) {
    let target = m[1];
    if (/^(https?:|mailto:|#|<)/i.test(target)) continue;
    target = target.split('#')[0];
    if (!target) continue;
    const resolved = resolve(dirname(file), target);
    if (!existsSync(resolved)) err(`${rel(file)}: broken internal link -> ${target}`);
  }
}

// --- external links (optional, warn-only) --------------------------------------

if (checkExternal) {
  const seen = new Set();
  for (const file of mdFiles.concat([registryPath])) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/https:\/\/[^\s)\]"'>]+/g)) {
      const url = m[0].replace(/[.,;]+$/, '');
      if (seen.has(url)) continue;
      seen.add(url);
      try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
        if (res.status >= 400) warn(`external link ${url} returned ${res.status} (${rel(file)})`);
      } catch (e) {
        warn(`external link ${url} unreachable (${rel(file)})`);
      }
    }
  }
}

// --- unused sources (info) -----------------------------------------------------

const referenced = new Set();
for (const { spec } of specRecords) for (const r of spec.rules) for (const s of r.sources) referenced.add(s);
for (const file of edgeFiles) {
  const doc = loadYaml(file);
  if (!doc) continue;
  for (const c of doc.cases) for (const s of c.sources) referenced.add(s);
}
const unused = [...sourceIds.keys()].filter((id) => !referenced.has(id));

// --- summary -------------------------------------------------------------------

const ruleCount = rules.size;
const edgeCount = edgeCases.size;

console.log(`specs:            ${specRecords.length}`);
console.log(`rules:            ${ruleCount}`);
console.log(`edge cases:       ${edgeCount}`);
console.log(`sources:          ${sourceIds.size} (registered), ${referenced.size} referenced`);
if (unused.length) console.log(`unreferenced:     ${unused.join(', ')} (registry documentation entries)`);
console.log(`markdown files:   ${mdFiles.length}`);

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK: all validations passed.');
