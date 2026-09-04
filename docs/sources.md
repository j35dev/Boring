# Sources

Boring rules are only as trustworthy as their evidence. This document explains how
sources are registered, classified, and referenced.

## The registry

Every external source referenced anywhere in Boring has a stable entry in
[sources/registry.yaml](../sources/registry.yaml). Specs and edge cases reference the
registry ID, never a raw URL:

```yaml
sources:
  - OWASP-FORGOT-PASSWORD
```

This gives provenance ("why is this rule here?") without duplicating metadata, and it
lets maintenance tooling check that every reference resolves.

A registry entry records: ID, title, organization, type, tier, URL, topics, access
date, and notes. Add a `license` field whenever the source's license is relevant to
reuse.

## Source types and tiers

The tier identifies what kind of evidence supports a rule — not a truth ranking. Higher
tiers are the preferred evidence for *universal* rules; vendor documentation is the
best evidence for *vendor* behavior and must stay scoped to that vendor.

| Tier | Type | Examples |
|---|---|---|
| 1 | `standard` | IETF RFCs, WHATWG specs, W3C specs, Unicode UAX/UTS, Unicode CLDR, IANA TZDB |
| 2 | `authoritative-guidance` | OWASP ASVS, OWASP Cheat Sheet Series, NIST SP 800-63 |
| 3 | `official-vendor-documentation` | Stripe, GitHub, AWS, Cloudflare, MDN |
| 4 | `oss-corpus` | Big List of Naughty Strings, Web Platform Tests |
| 5 | `engineering-incident` | engineering postmortems, documented incidents |
| 6 | `community-evidence` | field experience from contributors and maintainers |

The registry retains a small set of legacy type values for compatibility with early
entries. New sources should use the more descriptive classes: `security-standard`,
`official-vendor-documentation`, `reference-data`, `oss-corpus`,
`engineering-incident`, `research`, or `community-evidence`.

## How Boring uses sources

- Rules derived from multiple sources describing one requirement become **one** rule
  with **multiple** sources (deduplicate, then attribute).
- Vendor-specific requirements are labeled as such and scoped with
  `applies_when` / `does_not_apply_when`. A vendor's choice is never promoted to a
  universal rule by renaming it.
- Where authoritative sources disagree, or behavior is genuinely a product decision,
  the rule says so (see `decision_required` in [methodology](methodology.md)) instead
  of inventing consensus.

## Adding a source

1. Check the registry for an existing entry covering the same material — extend its
   `topics` rather than adding a duplicate.
2. Add the entry with today's `accessed` date. Update the `accessed` date only if you
   re-verified the URL and content.
3. Prefer the canonical URL (the RFC editor page, the current OWASP cheat sheet URL,
   the official docs domain) over mirrors or archived copies.
4. Write original `notes`: what this source is authoritative *for*.
5. Run `npm run validate` — the validator checks that every source referenced by a
   rule or edge case exists in the registry.

## Access dates and link health

`accessed` records when the content was last verified by a human. External link checks
run as a separate, non-blocking CI job: a temporarily unreachable website must not fail
the repository, but a persistently dead URL should be re-verified and re-anchored
(e.g., to the citing section or an archived snapshot) during content review.
