# Methodology

This document describes how Boring content is researched, written, and reviewed.
Every contribution — maintainer or community — follows the same process.

The canonical structured record is `spec.yaml` or an edge-case dataset. Markdown
README files provide the human navigation layer. Do not maintain a second, conflicting
normative copy by hand.

## The two admission questions

Before adding any requirement or edge case, answer:

1. **Would a competent developer be annoyed if this caused a production bug because
   nobody remembered to consider it?** If no, it does not belong.
2. **Can we explain why it belongs using evidence?** If no, research more before
   adding it. AI can help research and write contributions; AI itself is not a source.

## Research workflow

### Step 1 — Build the source map

Identify the primary and authoritative sources for the domain before writing anything:
standards (IETF, WHATWG, W3C, Unicode), authoritative guidance (OWASP, NIST), official
vendor documentation, mature open-source corpora and test suites. Add them to
[sources/registry.yaml](../sources/registry.yaml) first.

### Step 2 — Extract candidate behaviors

Create research notes recording, for each candidate behavior: the behavior, the source,
the relevant source section, applicability, whether the source uses normative language,
and possible edge cases.

### Step 3 — Normalize into atomic rules

Turn broad advice into atomic rules. "Password resets should be secure" is not a rule.
"Reset tokens are single-use" is. One rule should represent one testable, reviewable
idea. If a rule needs the word "and" to describe two independently verifiable
behaviors, split it.

### Step 4 — Deduplicate

Multiple sources often describe the same underlying requirement. Create one Boring rule
and attach multiple sources, rather than one rule per source.

### Step 5 — Determine applicability and level

For each rule, ask:

- Is this universal behavior, or specific to an architecture (cookies, queues, S3)?
- Is this security guidance, product guidance, or a pure product decision?
- Does the source use normative language, or is it advisory?

Then assign:

| Level | Meaning |
|---|---|
| `MUST` | An implementation would normally be incorrect, unsafe, or seriously incomplete without it. |
| `SHOULD` | Strong default guidance; legitimate applications may have reasons not to follow it. |
| `CONSIDER` | Context-dependent behavior worth deliberately deciding. |

Rules whose real requirement is "define and enforce your own policy" (e.g., maximum
name length) are marked `decision_required: true`. Their expected verification outcome
is that a documented policy exists and is enforced consistently — not that a specific
choice was made.

### Step 6 — Extract edge cases

Ask for every rule: How does this normally fail? What happens at boundaries? What
happens twice? What happens concurrently? What happens out of order? What happens
internationally? What happens during partial failure? Record edge cases using the
[taxonomy](taxonomy.md#edge-case-kinds), with concrete `given / when / expect`
scenarios.

### Step 7 — Add verification scenarios

Describe how a human, a test, or an agent could determine whether the requirement
holds. Use the `given / when / expect` shape (see
[designing for tomorrow's tests](test-strategy.md#what-the-v01-data-provides)). Do not
tie scenarios to Gherkin/Cucumber without a strong reason.

### Step 8 — Cross-check

For important or controversial rules, find additional evidence. Prefer primary sources
over secondary write-ups. If authoritative sources disagree, or behavior depends on
provider or product policy, document the disagreement instead of picking a winner.

### Adversarial counterexample review

Before merge, try to construct a legitimate application where each MUST or SHOULD
does not apply. If that counterexample is real, narrow the scope, downgrade the level,
or make the behavior `decision_required`. See the [reviewer guide](reviewer-guide.md).

### Record evidence and verify the graph

Each rule and important edge case records `evidence` with a registry source, a precise
locator, and `direct`, `derived`, or `contextual` support. `contextual` evidence may
explain a failure mode or provider behavior but cannot establish a universal MUST or
SHOULD. Run `npm run validate` before opening a pull request.

## Source quality tiers

Tiers identify what kind of evidence supports a rule. A higher tier is not necessarily
"more true" — it is more appropriate evidence for a *universal* rule. Vendor docs are
extremely valuable, but vendor-specific requirements must stay vendor-specific.

| Tier | Kind | Examples |
|---|---|---|
| 1 | Standards / specifications | IETF RFCs, WHATWG, W3C, Unicode |
| 2 | Authoritative application guidance | OWASP ASVS, OWASP Cheat Sheets, NIST SP 800-63 |
| 3 | Official vendor behavior | Stripe, GitHub, AWS, Cloudflare, MDN |
| 4 | Established OSS corpora / test suites | Big List of Naughty Strings, Web Platform Tests |
| 5 | Engineering incident / field evidence | postmortems, documented incident reports |
| 6 | Community contribution | reviewer and maintainer experience |

Sourcing policy:

- Every rule and edge case must cite at least one registered source from tiers 1–5.
  A missing source is a research task, not a finished contribution.
- Tier 6 community experience may supplement stronger evidence, but it cannot be the
  sole source for published content. A contextual or product-dependent conclusion is
  still marked `CONSIDER` or `decision_required`; provenance does not make it universal.

## Provenance, attribution, and copyright

Boring is not a scraped mirror of other people's work.

- Every source is registered with its organization, URL, access date, and, where
  relevant, license.
- Explanations are written in original words; quotation is minimal.
- Third-party corpora are referenced to learn categories and find omissions — not
  copied wholesale. Before importing any dataset or fixture: verify the license,
  preserve required attribution, document the origin.
- For v0.1, representative edge cases are authored from documented categories rather
  than imported from third-party corpora.

## Rule and edge-case lifecycle

New rules and edge cases enter with `status: draft`. A merge is not a review:
merging makes content *available*, not *authoritative*. Promotion to `reviewed` and
`stable` happens when a maintainer has verified the sourcing, applicability, and
scenarios — the exact process will be defined as the community grows. `deprecated`
rules keep their ID forever; the ID is never reassigned to a different meaning.
