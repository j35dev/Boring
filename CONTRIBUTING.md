# Contributing to Boring

Boring's value depends on every entry being **deliberate**: a real, recurring problem,
backed by evidence, scoped honestly. This guide explains how to contribute one.

Before proposing content, read [docs/philosophy.md](docs/philosophy.md) and
[docs/methodology.md](docs/methodology.md). They are the review criteria.

## What we accept

- A **new rule** for an existing spec: one testable requirement with sources, scope,
  and a verification scenario.
- A **new edge case**: a situation that commonly breaks implementations, classified
  with the [taxonomy](docs/taxonomy.md#edge-case-kinds), with a concrete
  given/when/expect scenario.
- **Improvements** to existing rules and edge cases: better wording, sharper scope,
  additional or better sources, missing failure modes, corrected facts.
- **New sources** for the registry (with URL, organization, tier, access date).

## The six questions every proposal must answer

```text
1. What problem does this represent?        (a real failure, not a hypothetical)
2. What is the evidence/source?             (registered source, tier 1-5)
3. What applications does it apply to?      (applies_when / does_not_apply_when)
4. Is it already represented?               (search specs/ and edge-cases/ first)
5. Is the expected behavior universal?      (if not: decision_required, not MUST)
6. Can it be verified?                      (a given/when/expect scenario)
```

If you cannot answer 1 and 2 yet, the contribution is a research task, not a PR — open
an issue describing the failure you hit, and it becomes one.

## What we do not accept

- **"I asked ChatGPT and it said this is best practice."** AI can help you research,
  structure, and word a contribution. AI itself is not a source. Find the primary
  document the claim traces back to, and cite that.
- Generic advice without provenance ("always sanitize input").
- Vendor behavior promoted to a universal rule.
- Bulk-generated PRs with dozens of entries. Boring is reviewed by humans, one
  deliberate idea at a time.

## Prefer small PRs

One rule, one edge case, or one clear improvement per pull request:

```text
Add edge case: duplicate webhook event
Add requirement: password reset token reuse
Clarify applicability of session timeout requirement
```

A PR with a hundred new rules cannot be reviewed at the standard that makes Boring
trustworthy, and will be asked to split.

## Mechanics

1. Fork, branch, change.
2. If you add or change rules/edge cases/sources, keep the Markdown (`README.md`) and
   the data (`spec.yaml` / dataset YAML) consistent — validation enforces that every
   rule's ID, level, and title appear in both its rules table and detail heading.
3. Run the checks:

   ```bash
   npm install
   npm run validate
   ```

   The validator enforces schemas, ID format and uniqueness, source references,
   cross-references between rules and edge cases, required verification scenarios, and
   internal Markdown links.
4. Open the PR using the template.

## Rule lifecycle

Everything starts as `status: draft`. Merging publishes content; it does not certify
it. Rules are promoted to `reviewed` and `stable` by maintainer review (process to be
defined as the community grows), and deprecated rules keep their IDs forever.

## Reporting bugs in content

Found a rule that is wrong, unsourced, or too broad? That is a high-value contribution.
Open an issue with the rule ID, what you believe is incorrect, and the source that
contradicts it.
