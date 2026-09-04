#!/usr/bin/env node
// Build a deterministic, normalized JSON snapshot for agents and future tooling.
// The YAML files remain the canonical source; this is a generated convenience file.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import yaml from 'js-yaml';

const root = resolve(import.meta.dirname, '..');

function walk(dir, predicate, result = []) {
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file, predicate, result);
    else if (predicate(name)) result.push(file);
  }
  return result;
}

const toRelative = (file) => relative(root, file).split('\\').join('/');
const specFiles = walk(join(root, 'specs'), (name) => name === 'spec.yaml');
const edgeFiles = walk(join(root, 'edge-cases'), (name) => name.endsWith('.yaml'));
const sources = yaml.load(readFileSync(join(root, 'sources', 'registry.yaml'), 'utf8'));

const output = {
  schema_version: 1,
  generated_from: 'spec.yaml + edge-cases/**/*.yaml + sources/registry.yaml',
  specs: specFiles.map((file) => ({ path: toRelative(file), ...yaml.load(readFileSync(file, 'utf8')) })),
  edge_case_datasets: edgeFiles.map((file) => ({ path: toRelative(file), ...yaml.load(readFileSync(file, 'utf8')) })),
  sources
};

const destination = join(root, 'dist');
mkdirSync(destination, { recursive: true });
writeFileSync(join(destination, 'boring.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`wrote dist/boring.json (${output.specs.length} specs, ${output.edge_case_datasets.length} edge-case datasets)`);
