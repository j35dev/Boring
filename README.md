# Boring

**The bugs you shouldn't have to rediscover.**

Boring is a community-maintained, evidence-backed specification of ordinary software
behavior: requirements, failure modes, edge cases, and verification scenarios.

Built for developers, reviewers, QA, maintainers, and coding agents.

## The problem

Ask an AI — or a rushed human — to add password reset and you will probably get:

- a reset endpoint,
- an email,
- a new-password form.

What is easy to forget?

Token reuse. Account enumeration. Concurrent redemption. Expiry boundaries. Session
invalidation. Changed email addresses. Link leakage.

Boring writes those expectations down before the bug reaches production.

## One example: the whole idea in one screen

```text
Feature       Password reset
Requirement   BORING-AUTH-RESET-004 — token is single-use (MUST)
Failure       Two concurrent requests redeem the same token
Edge case     BORING-EDGE-AUTH-RESET-005
Verify        at most one request changes the password; the other is rejected
Evidence      OWASP-FORGOT-PASSWORD — General Security Practices
```

Follow the requirement to its [edge cases](edge-cases/authentication/password-reset-state.yaml),
its `given / when / expect` scenarios, and its [machine-readable evidence](specs/authentication/password-reset/spec.yaml).
That graph — not a list of slogans — is the product.

## Try it in 30 seconds

There is nothing to install. Point your coding agent at a spec and paste:

```text
Read the Boring password-reset specification at
specs/authentication/password-reset/README.md and its linked edge cases.
Audit this repository against every applicable rule. Report PASS, FAIL, or UNKNOWN
using the Boring rule IDs, cite the relevant files, and suggest regression tests for
failed scenarios. Do not treat a product decision as a universal requirement.
```

Start with the [Password Reset spec](specs/authentication/password-reset/README.md),
or use the same approach with any catalog entry below.

## Browse the catalog

| Area | Specification | Rules | What it covers |
|---|---|---:|---|
| Authentication | [Password reset](specs/authentication/password-reset/README.md) | 14 | recovery, token lifecycle, enumeration, sessions |
| Authentication | [Sessions](specs/authentication/sessions/README.md) | 12 | login, logout, cookies, timeouts, revocation |
| Integrations | [Webhooks](specs/webhooks/README.md) | 13 | duplicates, ordering, retries, signatures |
| Data | [File uploads](specs/file-uploads/README.md) | 12 | type, storage, authorization, resource limits |
| Data | [Input, text & Unicode](specs/input-validation/README.md) | 12 | normalization, lengths, parsing, spoofing |
| API | [Pagination](specs/pagination/README.md) | 9 | ordering, cursors, boundaries, limits |

Cross-cutting edge-case datasets cover [authentication state](edge-cases/authentication/password-reset-state.yaml),
[sessions](edge-cases/authentication/sessions-state.yaml), [webhook delivery](edge-cases/webhooks/delivery.yaml),
[files](edge-cases/files/uploads.yaml), [email](edge-cases/email/addresses.yaml), [date and time](edge-cases/date-time/timestamps.yaml),
[numeric boundaries](edge-cases/numbers/boundaries.yaml), [Unicode/text](edge-cases/strings/unicode.yaml),
and [pagination traversal](edge-cases/pagination/traversal.yaml).

An edge case can be a value, state, boundary, sequence, retry, concurrency, locale,
environment, authorization, privacy, compatibility, failure, or recovery scenario.
For example: a webhook delivered twice, two resets completing together, a DST
transition, or `résumé.pdf`.

## Machine-readable dataset

Tools and agents can consume the full normalized corpus without an API or CLI:
[`dist/boring.json`](dist/boring.json) is the deterministic generated snapshot of
every `spec.yaml`, every `edge-cases/**/*.yaml`, and the source registry.
Regenerate it with `npm run build:dataset` after structured data changes; the YAML
files remain canonical.

## How Boring works

```text
What should happen?
        ↓
What could go wrong?
        ↓
How can we verify it?
        ↓
Why do we believe it?
```

Each spec has a human-readable README and canonical `spec.yaml`. Rules keep a stable
ID, level, applicability, rationale, failure modes, linked edge cases, verification,
and evidence. `direct`, `derived`, and `contextual` evidence say how the source
supports the claim; contextual evidence is never silently promoted into a universal
MUST or SHOULD.

## Use Boring in your work

- **Developer:** use a spec as a pre-implementation checklist.
- **Reviewer:** cite `BORING-WEBHOOK-001` in a review comment and follow the graph.
- **Coding agent:** provide the relevant spec and edge cases as implementation context.
- **QA author:** turn verification scenarios into project-native tests.
- **Maintainer:** report the production bug that made you say, “how did we not think of that?”

For copyable snippets, see [examples/agent-audit-prompt.md](examples/agent-audit-prompt.md),
[examples/implementation-prompt.md](examples/implementation-prompt.md), and
[examples/review-comment.md](examples/review-comment.md).

## Why trust it

- Primary standards and authoritative guidance come before opinions.
- Every published entry keeps source IDs, locators, and an evidence interpretation.
- MUST is expensive; the Phase 2 audit downgraded claims that were strong defaults or decisions.
- Vendor behavior stays scoped to the vendor or protocol that documents it.
- Rules and edge cases remain reviewable in Git, with schemas and CI validation.
- AI may help write Boring, but AI is never accepted as evidence.

Read the [methodology](docs/methodology.md), [evidence audit](docs/evidence-audit.md),
and [source registry](sources/registry.yaml) for the details.

## Something boring bit you?

That is probably a contribution.

Open [“Something boring bit me”](https://github.com/j35dev/Boring/issues/new?template=something-boring-bit-me.yml)
with what happened, what you expected, and the smallest useful scenario. You do not
need to know YAML, evidence tiers, or rule IDs. Maintainers can normalize the report.

If you already have a sourced, structured proposal, use the [rule proposal template](https://github.com/j35dev/Boring/issues/new?template=propose-rule.yml)
or [evidence improvement template](https://github.com/j35dev/Boring/issues/new?template=improve-evidence.yml).
See [CONTRIBUTING.md](CONTRIBUTING.md) for the easy and advanced paths.

## Status

Boring is young and intentionally honest about it. The current corpus is `draft` until
independently reviewed; a merge publishes content, it does not certify it. This is a
well-sourced engineering reference today, not a formal industry standard, security
guarantee, or complete catalog.

Planned areas include API keys, rate limiting, account deletion, invitations,
background jobs, money, and dates/time — only when they meet the same bar.
The [roadmap](docs/roadmap.md) describes the direction without promising dates.

## FAQ

**Is Boring a security standard?** No. Security matters here, but Boring covers broader
application correctness too.

**Is it only for AI coding?** No. Agents are useful consumers; the source of value is
the reviewed knowledge graph for humans and teams.

**Why not just use OWASP?** Boring references OWASP where it applies, then connects
requirements to edge cases and verification and also covers non-security correctness.

**Is it a test runner?** Not currently. [Test strategy](docs/test-strategy.md) explores
future models without committing the project to a CLI or framework.

**Are rules universal?** No. Applicability and `decision_required` are first-class
fields. Read the scope before treating a rule as relevant to an implementation.

## Repository map

```text
specs/       feature specifications (README.md + canonical spec.yaml)
edge-cases/  cross-cutting scenario datasets
sources/     registered provenance and source metadata
schemas/      JSON Schemas for the data model
docs/        methodology, taxonomy, review policy, and roadmap
examples/    copyable audit, implementation, and review prompts
scripts/     maintainers' validation and export tooling
dist/        generated machine-readable snapshot (dist/boring.json)
```

Run `npm install` and `npm run validate` to check the repository locally. The project
is MIT-licensed; third-party material is cited, not copied.
