# Boring

**The boring parts of building software, already figured out.**

AI can build a password-reset flow in seconds.

It might forget:

- token reuse
- account enumeration
- session invalidation
- request throttling
- expired tokens
- weird email addresses
- concurrent requests

Boring is a community-maintained collection of application specs, edge cases, and
verification scenarios for exactly this: the ordinary, well-understood behavior that
production applications keep getting wrong because nobody remembered to consider it.

Use it with humans. Use it with Claude. Use it with Codex. Use it in reviews.

Just don't rediscover the same bugs again.

## What's inside

**Specs** — what a correct implementation of a common feature must do. Behavior, not
architecture: no framework choices, no tutorials. Every requirement is atomic, leveled
(`MUST` / `SHOULD` / `CONSIDER`), scoped with explicit applicability, and backed by
registered sources.

| Spec | Rules | Focus |
|---|---|---|
| [Password reset](specs/authentication/password-reset/README.md) | 14 | enumeration, token lifecycle, takeover prevention |
| [Sessions](specs/authentication/sessions/README.md) | 12 | lifecycle, cookies, tokens, revocation |
| [Webhooks](specs/webhooks/README.md) | 13 | duplicates, ordering, retries, signatures, replay |
| [File uploads](specs/file-uploads/README.md) | 12 | validation, storage, serving, bombs, interruptions |
| [Input, text & Unicode](specs/input-validation/README.md) | 12 | normalization, length units, invisible characters, parsers |

**Edge cases** — the situations that break implementations, each with a concrete
given/when/expect scenario: [Unicode & text](edge-cases/strings/unicode.yaml) (20) ·
[email addresses](edge-cases/email/addresses.yaml) (15) ·
[date & time](edge-cases/date-time/timestamps.yaml) (15) ·
[files](edge-cases/files/uploads.yaml) (15) ·
[webhook delivery](edge-cases/webhooks/delivery.yaml) (11) ·
[password-reset state](edge-cases/authentication/password-reset-state.yaml) (12) ·
[session state](edge-cases/authentication/sessions-state.yaml) (6) ·
[numeric boundaries](edge-cases/numbers/boundaries.yaml) (12)

An edge case in Boring is more than a weird string: it can be a *state* (token already
used), a *sequence* (event B before event A), a *retry* (same webhook twice), a
*concurrency* (two simultaneous resets), a *locale* (DST transition), or an
*environment* (client disconnects mid-upload). See the
[taxonomy](docs/taxonomy.md#edge-case-kinds).

**Provenance** — every rule cites its evidence through a
[source registry](sources/registry.yaml) of 37 standards, guidelines, and official
vendor documents (OWASP, NIST, IETF RFCs, WHATWG, Unicode, IANA, Stripe, GitHub),
each with tier, URL, and access date.

## Using Boring

No installation. No accounts. Read the Markdown, or point an agent at it.

### As a human

Building file uploads? Read [specs/file-uploads/](specs/file-uploads/README.md) and
[edge-cases/files/](edge-cases/files/uploads.yaml) before you write the handler —
and again before you ship it.

### With an AI agent — audit

```text
Read the Boring file-upload specification and edge cases
(specs/file-uploads/README.md, edge-cases/files/uploads.yaml).

Audit the upload implementation in this repository.

Report:
1. satisfied requirements,
2. violations,
3. requirements that cannot be verified,
4. missing tests.

Reference Boring rule IDs in your findings.
```

### With an AI agent — implement

```text
Implement password reset according to the Boring password-reset
specification (specs/authentication/password-reset/).

Before finishing, review all linked Boring edge cases and add
regression tests for applicable acceptance scenarios. Mention any
Boring rule you intentionally do not support.
```

### In your agent instructions

Drop this into your `AGENTS.md` / `CLAUDE.md` / `.codex` instructions:

```markdown
## Boring

For common application features, consult the relevant Boring specification.

When implementing a feature:

1. Review applicable Boring requirements.
2. Check linked edge cases.
3. Add tests for applicable acceptance scenarios.
4. Mention any intentionally unsupported Boring rules.

Source: the Boring open-source repository.
```

## Repository layout

```text
specs/         feature specifications (README.md + spec.yaml per feature)
edge-cases/    cross-cutting edge-case datasets (YAML)
sources/       the source registry (provenance for every claim)
schemas/       JSON schemas for specs, edge cases, and sources
docs/          philosophy, methodology, taxonomy, sources, test strategy, roadmap
scripts/       repository validation tooling (maintenance, not the product)
```

Every spec is published twice: `README.md` (for humans and agents reading Markdown)
and `spec.yaml` (the same requirements as normalized data — infrastructure for future
tooling, test generation, and audits). The Markdown is the product for now; the YAML
is how Boring stays machine-consumable without becoming one.

## Why trust it

- **Primary sources beat opinions.** Rules cite standards and authoritative guidance —
  OWASP ASVS 5.0, OWASP Cheat Sheets, NIST SP 800-63B, IETF RFCs, WHATWG, Unicode,
  IANA — not blog posts. See [docs/sources.md](docs/sources.md).
- **Fact is separated from opinion.** `MUST` means an implementation is wrong without
  it. Where honest answer is "decide for yourself", the rule says so
  (`decision_required`) instead of inventing a universal rule. See
  [docs/philosophy.md](docs/philosophy.md).
- **Everything is scoped.** Cookie rules apply to cookies; Stripe's retry window is
  Stripe's. Vendor behavior is never promoted to universal law.
- **IDs are stable.** `BORING-AUTH-RESET-004` means the same thing forever, so you can
  cite it in reviews, bugs, and test output.
- **It's validated.** CI checks schemas, ID uniqueness, cross-references, and
  Markdown/data consistency on every change.

## Status

v0.1 — five specs, 63 rules, 106 edge cases, built on 37 registered sources. All
content is `status: draft` until reviewed; a merge publishes, it does not certify.
What comes next is in the [roadmap](docs/roadmap.md); how verification could
eventually become executable is explored (but not built) in
[docs/test-strategy.md](docs/test-strategy.md).

## Contributing

The best first contribution is the bug you already hit: the edge case that bit you in
production, with the source that explains it. Read
[CONTRIBUTING.md](CONTRIBUTING.md) — every entry must answer for the problem it
represents, its evidence, and its applicability. AI can help you write it; AI is not
a source.

## License

[MIT](LICENSE). The source materials referenced by Boring belong to their authors and
are cited, not copied.
